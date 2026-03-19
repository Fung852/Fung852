#!/usr/bin/env python3
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import timedelta
from pathlib import Path
from typing import Dict, List, Tuple

import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext, ttk

from minute_data_tool import daterange_minutes, load_rows, resolve_time_range, write_repaired_csv


def build_report(
    input_csv: Path,
    headers: List[str],
    time_col: str,
    parsed_rows,
    parse_errors: List[str],
    start_arg: str,
    end_arg: str,
    keep_mode: str,
    encoding: str,
    output_csv: str,
    show_max: int = 20,
) -> Tuple[str, bool]:
    if not parsed_rows:
        raise ValueError("没有可用数据行，请检查 CSV。")

    minute_counts = Counter(r.minute_ts for r in parsed_rows)
    unique_minutes = sorted(minute_counts.keys())
    start, end = resolve_time_range(unique_minutes, start_arg or None, end_arg or None)
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

    day = start.replace(hour=0, minute=0)
    end_day = end.replace(hour=0, minute=0)
    abnormal_days: List[Tuple[str, int]] = []
    while day <= end_day:
        ds = day.strftime("%Y-%m-%d")
        c = daily_unique_counts.get(ds, 0)
        if c != 1440:
            abnormal_days.append((ds, c))
        day += timedelta(days=1)

    repaired = False
    if output_csv.strip():
        kept_rows: Dict = {}
        row_iter = parsed_rows if keep_mode == "first" else reversed(parsed_rows)
        for item in row_iter:
            if item.minute_ts not in kept_rows:
                kept_rows[item.minute_ts] = item.row
        write_repaired_csv(
            output_csv=Path(output_csv),
            headers=headers,
            time_col=time_col,
            kept_rows=kept_rows,
            start=start,
            end=end,
            encoding=encoding,
        )
        repaired = True

    lines: List[str] = []
    lines.append("=" * 66)
    lines.append("分钟数据诊断结果")
    lines.append("=" * 66)
    lines.append(f"输入文件:         {input_csv}")
    lines.append(f"识别时间列:       {time_col}")
    lines.append(
        f"统计范围:         {start.strftime('%Y-%m-%d %H:%M')} -> {end.strftime('%Y-%m-%d %H:%M')}"
    )
    lines.append(f"原始数据行数:     {total_rows}")
    lines.append(f"唯一分钟数:       {unique_count}")
    lines.append(f"重复行(额外):     {duplicate_extra}")
    lines.append(f"应有分钟总数:     {expected_total}")
    lines.append(f"缺失分钟总数:     {len(missing_minutes)}")
    lines.append(f"解析失败行数:     {len(parse_errors)}")

    duplicates = sorted((m, c) for m, c in minute_counts.items() if c > 1)
    if duplicates:
        lines.append("\n重复分钟示例:")
        for m, c in duplicates[:show_max]:
            lines.append(f"  {m.strftime('%Y-%m-%d %H:%M')} -> {c} 次")
        if len(duplicates) > show_max:
            lines.append(f"  ... 省略 {len(duplicates) - show_max} 条")

    if missing_minutes:
        lines.append("\n缺失分钟示例:")
        for m in missing_minutes[:show_max]:
            lines.append(f"  {m.strftime('%Y-%m-%d %H:%M')}")
        if len(missing_minutes) > show_max:
            lines.append(f"  ... 省略 {len(missing_minutes) - show_max} 条")

    if abnormal_days:
        lines.append("\n每日分钟数异常（期望 1440）:")
        for ds, c in abnormal_days[:show_max]:
            lines.append(f"  {ds} -> {c}")
        if len(abnormal_days) > show_max:
            lines.append(f"  ... 省略 {len(abnormal_days) - show_max} 天")
    else:
        lines.append("\n每日分钟数检查通过（每天均为 1440）。")

    if parse_errors:
        lines.append("\n解析失败示例:")
        for err in parse_errors[:show_max]:
            lines.append(f"  {err}")
        if len(parse_errors) > show_max:
            lines.append(f"  ... 省略 {len(parse_errors) - show_max} 条")

    if repaired:
        lines.append(f"\n已输出修复文件: {output_csv}")

    return "\n".join(lines), repaired


class MinuteDataGui(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("分钟数据诊断与修复工具")
        self.geometry("920x680")
        self.minsize(860, 620)

        self.input_var = tk.StringVar()
        self.output_var = tk.StringVar()
        self.time_col_var = tk.StringVar()
        self.start_var = tk.StringVar()
        self.end_var = tk.StringVar()
        self.keep_var = tk.StringVar(value="first")
        self.encoding_var = tk.StringVar(value="utf-8-sig")

        self._build_ui()

    def _build_ui(self) -> None:
        frm = ttk.Frame(self, padding=12)
        frm.pack(fill=tk.BOTH, expand=True)

        ttk.Label(frm, text="输入 CSV").grid(row=0, column=0, sticky="w")
        ttk.Entry(frm, textvariable=self.input_var, width=90).grid(row=0, column=1, sticky="ew", padx=6)
        ttk.Button(frm, text="选择文件", command=self.select_input).grid(row=0, column=2, sticky="ew")

        ttk.Label(frm, text="输出 CSV（可选）").grid(row=1, column=0, sticky="w", pady=(8, 0))
        ttk.Entry(frm, textvariable=self.output_var, width=90).grid(
            row=1, column=1, sticky="ew", padx=6, pady=(8, 0)
        )
        ttk.Button(frm, text="选择保存位置", command=self.select_output).grid(row=1, column=2, sticky="ew", pady=(8, 0))

        options = ttk.LabelFrame(frm, text="可选参数", padding=10)
        options.grid(row=2, column=0, columnspan=3, sticky="ew", pady=10)
        options.columnconfigure(1, weight=1)
        options.columnconfigure(3, weight=1)

        ttk.Label(options, text="时间列名").grid(row=0, column=0, sticky="w")
        ttk.Entry(options, textvariable=self.time_col_var, width=24).grid(row=0, column=1, sticky="ew", padx=6)

        ttk.Label(options, text="开始时间").grid(row=0, column=2, sticky="w")
        ttk.Entry(options, textvariable=self.start_var, width=24).grid(row=0, column=3, sticky="ew", padx=6)

        ttk.Label(options, text="结束时间").grid(row=1, column=0, sticky="w", pady=(8, 0))
        ttk.Entry(options, textvariable=self.end_var, width=24).grid(row=1, column=1, sticky="ew", padx=6, pady=(8, 0))

        ttk.Label(options, text="CSV 编码").grid(row=1, column=2, sticky="w", pady=(8, 0))
        ttk.Entry(options, textvariable=self.encoding_var, width=24).grid(
            row=1, column=3, sticky="ew", padx=6, pady=(8, 0)
        )

        ttk.Label(options, text="重复保留").grid(row=2, column=0, sticky="w", pady=(8, 0))
        keep_box = ttk.Combobox(options, textvariable=self.keep_var, values=["first", "last"], state="readonly", width=20)
        keep_box.grid(row=2, column=1, sticky="w", padx=6, pady=(8, 0))

        ttk.Button(frm, text="开始诊断/修复", command=self.run_job).grid(row=3, column=0, columnspan=3, sticky="ew")

        ttk.Label(frm, text="结果").grid(row=4, column=0, sticky="w", pady=(10, 4))
        self.result_box = scrolledtext.ScrolledText(frm, wrap=tk.WORD, height=24)
        self.result_box.grid(row=5, column=0, columnspan=3, sticky="nsew")

        frm.columnconfigure(1, weight=1)
        frm.rowconfigure(5, weight=1)

    def select_input(self) -> None:
        path = filedialog.askopenfilename(
            title="选择输入 CSV",
            filetypes=[("CSV 文件", "*.csv"), ("所有文件", "*.*")],
        )
        if not path:
            return
        self.input_var.set(path)
        if not self.output_var.get().strip():
            p = Path(path)
            default_out = p.with_name(f"{p.stem}_repaired.csv")
            self.output_var.set(str(default_out))

    def select_output(self) -> None:
        path = filedialog.asksaveasfilename(
            title="选择输出 CSV",
            defaultextension=".csv",
            filetypes=[("CSV 文件", "*.csv"), ("所有文件", "*.*")],
        )
        if path:
            self.output_var.set(path)

    def run_job(self) -> None:
        input_path = self.input_var.get().strip()
        output_path = self.output_var.get().strip()
        if not input_path:
            messagebox.showwarning("提示", "请先选择输入 CSV 文件。")
            return

        csv_file = Path(input_path)
        if not csv_file.exists():
            messagebox.showerror("错误", f"输入文件不存在:\n{csv_file}")
            return

        try:
            encoding = self.encoding_var.get().strip() or "utf-8-sig"
            headers, time_col, parsed_rows, parse_errors = load_rows(
                input_csv=csv_file,
                time_col_arg=self.time_col_var.get().strip() or None,
                encoding=encoding,
            )
            if not headers:
                raise ValueError("CSV 表头为空。")

            report, repaired = build_report(
                input_csv=csv_file,
                headers=headers,
                time_col=time_col,
                parsed_rows=parsed_rows,
                parse_errors=parse_errors,
                start_arg=self.start_var.get().strip(),
                end_arg=self.end_var.get().strip(),
                keep_mode=self.keep_var.get().strip() or "first",
                encoding=encoding,
                output_csv=output_path,
            )
            self.result_box.delete("1.0", tk.END)
            self.result_box.insert(tk.END, report)

            report_path = csv_file.with_name(f"{csv_file.stem}_diagnosis_report.txt")
            report_path.write_text(report, encoding="utf-8")

            if repaired:
                messagebox.showinfo(
                    "完成",
                    f"诊断完成，且已写出修复文件。\n\n输出: {output_path}\n报告: {report_path}",
                )
            else:
                messagebox.showinfo(
                    "完成",
                    f"诊断完成（未输出修复文件）。\n\n报告: {report_path}",
                )
        except Exception as exc:
            messagebox.showerror("执行失败", str(exc))


def main() -> None:
    app = MinuteDataGui()
    app.mainloop()


if __name__ == "__main__":
    main()
