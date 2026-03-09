# 股票回测 Jupyter 模板

这个模板提供一个可直接运行的 Notebook，用真实股票历史数据进行：

- 特征构建（收益率、均线偏离、波动率）
- 次日收益预测（随机森林）
- 策略信号生成（预测收益大于阈值则持仓）
- 回测与可视化（收益曲线、回撤曲线）
- 绩效评估（年化收益、Sharpe、最大回撤、胜率、换手率）

## 目录结构

```text
stock_backtest_template/
├── requirements.txt
└── notebooks/
    └── real_stock_backtest_template.ipynb
```

## 快速开始

1. 安装依赖

```bash
pip install -r stock_backtest_template/requirements.txt
```

2. 启动 Jupyter

```bash
jupyter notebook
```

3. 打开并运行：

`stock_backtest_template/notebooks/real_stock_backtest_template.ipynb`

## Notebook 可调参数

在第一个代码单元里可以修改：

- `TICKER`: 股票代码（如 `AAPL`, `TSLA`, `0700.HK`）
- `START_DATE`, `END_DATE`: 数据区间
- `TRAIN_RATIO`: 训练/测试切分比例
- `FEE_BPS`: 单边交易成本（基点）
- `PRED_THRESHOLD`: 入场阈值（过滤低置信度信号）

## 说明

- 这是教学模板，不构成投资建议。
- 历史表现不代表未来收益。
