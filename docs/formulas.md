# Margin Level Formulas

## Core Concepts

### Margin Level (ML%)

The margin level is the ratio of equity to used margin, expressed as a percentage. It indicates the health of a trading account.

```
ML% = (Equity / Used_Margin) × 100
```

**Interpretation:**
- **ML% > 500%**: Safe zone
- **ML% 100-500%**: Caution zone
- **ML% < 100%**: Margin call triggered
- **ML% = 50%**: Stop out (broker closes positions)

---

## Equity Calculation

### Formula

```
Equity = Balance + Credit + Floating_PL
```

**Components:**
- **Balance**: Realized P/L + deposits - withdrawals
- **Credit**: Broker bonuses, non-withdrawable credit
- **Floating_PL**: Sum of all open position P/L

### Floating P/L Calculation

For each position:

```
PL = (Current_Price - Open_Price) × Volume × Contract_Size × Point_Value
```

**Direction Adjustment:**
- **Long (Buy)**: PL = (Current - Open) × multiplier
- **Short (Sell)**: PL = (Open - Current) × multiplier

**Multiplier Calculation:**
```
Point_Value = Tick_Value / Tick_Size
```

### Examples

#### EURUSD (Forex)
- Contract Size: 100,000 units
- Tick Size: 0.00001
- Tick Value: $1.00
- Point Value: 1.0 / 0.00001 = 100,000

**Scenario:** Buy 1 lot at 1.0850, current price 1.0875
```
PL = (1.0875 - 1.0850) × 1.0 × 100,000
PL = 0.0025 × 100,000
PL = $250
```

#### XAUUSD (Gold)
- Contract Size: 100 oz
- Tick Size: 0.01
- Tick Value: $1.00
- Point Value: 1.0 / 0.01 = 100

**Scenario:** Buy 1 lot at 2000.00, current price 2010.00
```
PL = (2010.00 - 2000.00) × 1.0 × 100
PL = 10.00 × 100
PL = $1,000
```

---

## Liquidation Price Calculation

### Concept

The liquidation price is the market price at which ML% reaches 100% (margin call threshold).

### Formula Derivation

At liquidation:
```
ML% = 100%
Equity = Used_Margin
Balance + Credit + Floating_PL = Used_Margin
```

Solving for Floating_PL:
```
Floating_PL = Used_Margin - Balance - Credit
```

### Single Position (Long)

```
(Current_Price - Open_Price) × Volume × Point_Value = Used_Margin - Balance - Credit

Liquidation_Price = Open_Price + (Used_Margin - Balance - Credit) / (Volume × Point_Value)
```

### Single Position (Short)

```
(Open_Price - Current_Price) × Volume × Point_Value = Used_Margin - Balance - Credit

Liquidation_Price = Open_Price - (Used_Margin - Balance - Credit) / (Volume × Point_Value)
```

### Multiple Positions

For N positions on the same symbol:
```
Σ(PL_i) = Used_Margin - Balance - Credit

Where PL_i = (P_liq - Open_i) × Volume_i × Point_Value (for longs)
      PL_i = (Open_i - P_liq) × Volume_i × Point_Value (for shorts)
```

**Solving for P_liq:**
```
P_liq = (Used_Margin - Balance - Credit + Σ(Open_i × Volume_i × Point_Value × Direction_i)) 
        / Σ(Volume_i × Point_Value × Direction_i)

Where Direction_i = +1 for long, -1 for short
```

---

## Required Balance Calculation

### Concept

Calculate the minimum balance needed to maintain ML% = 100% at a target adverse price.

### Formula

At target price with ML% = 100%:
```
Balance_Required + Credit + Floating_PL(target) = Used_Margin

Balance_Required = Used_Margin - Credit - Floating_PL(target)
```

### Additional Deposit

```
Additional_Deposit = max(0, Balance_Required - Current_Balance)
```

### Example

**Current State:**
- Balance: $10,000
- Credit: $0
- Used Margin: $1,000
- Position: Buy 1 lot EURUSD at 1.0850
- Current Price: 1.0875

**Target Price:** 1.0700 (150 pips adverse)

**Calculate Floating PL at Target:**
```
PL = (1.0700 - 1.0850) × 1.0 × 100,000
PL = -0.0150 × 100,000
PL = -$1,500
```

**Calculate Required Balance:**
```
Balance_Required = 1,000 - 0 - (-1,500)
Balance_Required = 1,000 + 1,500
Balance_Required = $2,500
```

**Additional Deposit Needed:**
```
Additional_Deposit = max(0, 2,500 - 10,000)
Additional_Deposit = $0 (sufficient balance)
```

---

## Stop Out Detection

### Critical Rule

**IF Balance == Equity → STOPPED OUT**

This indicates:
- All credit has been consumed
- All positions have been closed by broker
- Account is in terminal state

### Detection Logic

```python
if abs(Balance - Equity) < tolerance:
    return STOPPED_OUT
```

**Tolerance:** $0.01 (accounts for floating point precision)

### UI Behavior

When STOPPED OUT is detected:
1. Display red warning modal
2. Disable all sliders and inputs
3. Lock calculator interface
4. Show message: "Credit exhausted, positions closed"

---

## Margin Call vs Stop Out

### Margin Call (ML% = 100%)

- **Trigger**: Equity = Used_Margin
- **Action**: Broker requests additional funds
- **Status**: Positions still open
- **Recovery**: Deposit funds or close positions

### Stop Out (ML% = 50% or broker-specific)

- **Trigger**: ML% reaches broker's stop out level
- **Action**: Broker forcibly closes positions
- **Status**: All positions closed
- **Recovery**: Account stopped out, requires reset

### Typical Broker Levels

| Level | ML% | Action |
|-------|-----|--------|
| Safe | > 500% | Normal trading |
| Caution | 200-500% | Monitor closely |
| Warning | 100-200% | Margin call |
| Critical | 50-100% | Imminent stop out |
| Stop Out | < 50% | Positions closed |

---

## Swap and Commission

### Overnight Swap

```
Swap = (Swap_Long or Swap_Short) × Volume × Days
```

**Included in Floating PL:**
```
Floating_PL = Price_PL + Swap + Commission
```

### Commission

```
Commission = Commission_Rate × Volume
```

**Typically charged:**
- On position open
- On position close
- Per lot or per transaction

---

## Cross-Currency Calculations

### Problem

When account currency ≠ quote currency, P/L must be converted.

### Formula

```
PL_account = PL_quote × Exchange_Rate
```

**Example:**
- Account: EUR
- Position: EURUSD (quote = USD)
- PL in USD: $250
- EUR/USD rate: 1.1000
- PL in EUR: 250 / 1.1000 = €227.27

---

## Hedging and Netting

### Hedged Positions

Long and short positions on same symbol:
```
Net_Exposure = |Volume_Long - Volume_Short|
```

**Margin Calculation:**
- **Hedged**: Reduced margin requirement (broker-specific)
- **Netted**: Only net exposure requires margin

### Example

**Positions:**
- Buy 2 lots EURUSD at 1.0850
- Sell 1 lot EURUSD at 1.0860

**Net Exposure:**
```
Net = 2 - 1 = 1 lot (long bias)
```

**Margin Required:**
- Only 1 lot margin (not 3 lots)

---

## Validation Checks

### Equity Consistency

```
Equity ≈ Balance + Credit + Σ(PL_i)
```

**Tolerance:** ±$1.00 (accounts for swap/commission timing)

### Free Margin Check

```
Free_Margin = Equity - Used_Margin
```

**Must be non-negative** (unless margin call triggered)

### Margin Level Sanity

```
ML% = (Equity / Used_Margin) × 100
```

**Edge Cases:**
- Used_Margin = 0 → ML% = ∞ (no positions)
- Equity < 0 → Account bankrupt
- ML% < 0 → Data error

---

## References

1. **MetaTrader 5 Documentation**: Margin calculation rules
2. **Investopedia**: Margin trading concepts
3. **Broker Specifications**: Contract sizes, tick values
4. **ISO 4217**: Currency codes and standards
