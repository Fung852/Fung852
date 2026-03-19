#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple


COMMON_TIME_FORMATS = [
    "%Y-%m-%d %H:%M",
    "%Y-%m-%d %H:%M:%S",
    "%Y/%m/%d %H:%M",
    "%Y/%m/%d %H:%M:%S",
    "%d/%m/%Y %H:%M",
    "%d/%m/%Y %H:%M:%S",
]


@dataclass
class ParsedRow:
    line_no: int
    minute_ts: datetime
    raw_ts: str
    row: Dict[str, str]


def parse_datetime(value: str) -> datetime:
    value = value.strip()
    if not value:
        raise ValueError("empty datetime value")

    for fmt in COMMON_TIME_FORMATS:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            pass

    try:
        return datetime.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f"unsupported datetime format: {value}") from exc


def parse_minute(value: str) -> datetime:
    dt = parse_datetime(value)
    return dt.replace(second=0, microsecond=0)


def daterange_minutes(start: datetime, end: datetime) -> Iterable[datetime]:
    current = start
    while current <= end:
        yield current
        current += timedelta(minutes=1)


def infer_time_col(headers: List[str], preferred: Optional[str]) -> str:
    if preferred:
        if preferred not in headers:
            raise ValueError(f"时间列 '{preferred}' 不存在。可用列: {headers}")
        return preferred

    candidates = ["timestamp", "time", "datetime", "date_time", "日期时间", "时间"]
    header_lower = {h.lower(): h for h in headers}
    for candidate in candidates:
        if candidate in header_lower:
            return header_lower[candidate]
        if candidate in headers:
            return candidate

    return headers[0]


def load_rows(input_csv: Path, time_col_arg: Optional[str], encoding: str) -> Tuple[List[str], str, List[ParsedRow], List[str]]:
    with input_csv.open("r", encoding=encoding, newline="") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            raise ValueError("CSV 没有表头，无法识别时间列。")
        headers = list(reader.fieldnames)
        time_col = infer_time_col(headers, time_col_arg)

        parsed_rows: List[ParsedRow] = []
        parse_errors: List[str] = []

        for idx, row in enumerate(reader, start=2):
            raw_ts = (row.get(time_col) or "").strip()
            try:
                minute_ts = parse_minute(raw_ts)
                parsed_rows.append(
                    ParsedRow(
                        line_no=idx,
                        minute_ts=minute_ts,
                        raw_ts=raw_ts,
                        row=row,
                    )
                )
            except ValueError as exc:
                parse_errors.append(f"line {idx}: {exc}")

    return headers, time_col, parsed_rows, parse_errors


def resolve_time_range(
    unique_minutes: List[datetime],
    start_arg: Optional[str],
    end_arg: Optional[str],
) -> Tuple[datetime, datetime]:
    if not unique_minutes:
        raise ValueError("没有有效时间数据，无法统计范围。")

    if start_arg:
        start = parse_minute(start_arg)
    else:
        first = min(unique_minutes)
        start = first.replace(hour=0, minute=0)

    if end_arg:
        end = parse_minute(end_arg)
    else:
        last = max(unique_minutes)
        end = last.replace(hour=23, minute=59)

    if start > end:
        raise ValueError("开始时间大于结束时间。")

    return start, end


def write_repaired_csv(
    output_csv: Path,
    headers: List[str],
    time_col: str,
    kept_rows: Dict[datetime, Dict[str, str]],
    start: datetime,
    end: datetime,
    encoding: str,
) -> None:
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    with output_csv.open("w", encoding=encoding, newline="") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        for minute in daterange_minutes(start, end):
            if minute in kept_rows:
                row = dict(kept_rows[minute])
                row[time_col] = minute.strftime("%Y-%m-%d %H:%M")
            else:
                row = {h: "" for h in headers}
                row[time_col] = minute.strftime("%Y-%m-%d %H:%M")
            writer.writerow(row)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="分钟级时间序列诊断与修复工具（重复/缺失检测，支持导出修复后 CSV）。"
    )
    parser.add_argument("-i", "--input", required=True, help="输入 CSV 文件路径")
    parser.add_argument("--time-col", default=None, help="时间列名称（默认自动识别）")
    parser.add_argument("--start", default=None, help="统计起始时间，例如 2024-01-01 00:00")
    parser.add_argument("--end", default=None, help="统计结束时间，例如 2024-01-31 23:59")
    parser.add_argument(
        "--keep",
        choices=["first", "last"],
        default="first",
        help="重复时间保留哪条记录（默认 first）",
    )
    parser.add_argument(
        "-o",
        "--output",
        default=None,
        help="输出修复后的 CSV 路径（若不填则仅诊断）",
    )
    parser.add_argument("--encoding", default="utf-8-sig", help="CSV 编码（默认 utf-8-sig）")
    parser.add_argument(
        "--show-max",
        type=int,
        default=20,
        help="终端最多展示多少条重复/缺失明细（默认 20）",
    )
    args = parser.parse_args()

    input_csv = Path(args.input)
    if not input_csv.exists():
        raise FileNotFoundError(f"输入文件不存在: {input_csv}")

    headers, time_col, parsed_rows, parse_errors = load_rows(
        input_csv=input_csv,
        time_col_arg=args.time_col,
        encoding=args.encoding,
    )

    if not parsed_rows:
        raise ValueError("没有可用数据行，请检查 CSV。")

    minute_counts = Counter(r.minute_ts for r in parsed_rows)
    unique_minutes = sorted(minute_counts.keys())
    start, end = resolve_time_range(unique_minutes, args.start, args.end)
    minute_set = set(unique_minutes)

    total_rows = len(parsed_rows)
    unique_count = len(unique_minutes)
    duplicate_extra = total_rows - unique_count
    expected_total = int((end - start).total_seconds() // 60) + 1
    missing_minutes = [m for m in daterange_minutes(start, end) if m not in minute_set]

    daily_unique_counts: Dict[str, int] = defaultdict(int)
    for m in unique_minutes:
        if start <= m <= end:
            daily_unique_counts[m.strftime("%Y-%m-%d")] += 1

    # 统计每天是否满 1440 条（按完整天假设）
    day = start.replace(hour=0, minute=0)
    end_day = end.replace(hour=0, minute=0)
    daily_expected = 1440
    abnormal_days: List[Tuple[str, int]] = []
    while day <= end_day:
        ds = day.strftime("%Y-%m-%d")
        c = daily_unique_counts.get(ds, 0)
        if c != daily_expected:
            abnormal_days.append((ds, c))
        day += timedelta(days=1)

    print("=" * 66)
    print("分钟数据诊断结果")
    print("=" * 66)
    print(f"输入文件:         {input_csv}")
    print(f"识别时间列:       {time_col}")
    print(f"统计范围:         {start.strftime('%Y-%m-%d %H:%M')} -> {end.strftime('%Y-%m-%d %H:%M')}")
    print(f"原始数据行数:     {total_rows}")
    print(f"唯一分钟数:       {unique_count}")
    print(f"重复行(额外):     {duplicate_extra}")
    print(f"应有分钟总数:     {expected_total}")
    print(f"缺失分钟总数:     {len(missing_minutes)}")
    print(f"解析失败行数:     {len(parse_errors)}")

    duplicates = sorted((m, c) for m, c in minute_counts.items() if c > 1)
    if duplicates:
        print("\n重复分钟示例:")
        for m, c in duplicates[: args.show_max]:
            print(f"  {m.strftime('%Y-%m-%d %H:%M')} -> {c} 次")
        if len(duplicates) > args.show_max:
            print(f"  ... 省略 {len(duplicates) - args.show_max} 条")

    if missing_minutes:
        print("\n缺失分钟示例:")
        for m in missing_minutes[: args.show_max]:
            print(f"  {m.strftime('%Y-%m-%d %H:%M')}")
        if len(missing_minutes) > args.show_max:
            print(f"  ... 省略 {len(missing_minutes) - args.show_max} 条")

    if abnormal_days:
        print("\n每日分钟数异常（期望 1440）:")
        for ds, c in abnormal_days[: args.show_max]:
            print(f"  {ds} -> {c}")
        if len(abnormal_days) > args.show_max:
            print(f"  ... 省略 {len(abnormal_days) - args.show_max} 天")
    else:
        print("\n每日分钟数检查通过（每天均为 1440）。")

    if parse_errors:
        print("\n解析失败示例:")
        for err in parse_errors[: args.show_max]:
            print(f"  {err}")
        if len(parse_errors) > args.show_max:
            print(f"  ... 省略 {len(parse_errors) - args.show_max} 条")

    if args.output:
        kept_rows: Dict[datetime, Dict[str, str]] = {}
        row_iter = parsed_rows if args.keep == "first" else reversed(parsed_rows)
        for item in row_iter:
            if item.minute_ts not in kept_rows:
                kept_rows[item.minute_ts] = item.row
        # 对于 "last"，因 reversed 后先遇到的是最后一条，逻辑已满足。
        write_repaired_csv(
            output_csv=Path(args.output),
            headers=headers,
            time_col=time_col,
            kept_rows=kept_rows,
            start=start,
            end=end,
            encoding=args.encoding,
        )
        print(f"\n已输出修复文件: {args.output}")


if __name__ == "__main__":
    main()
