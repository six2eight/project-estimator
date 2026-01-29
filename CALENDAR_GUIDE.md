# 📅 Calendar Week Selector - Quick Guide

## How It Works

The new calendar picker allows you to jump to any week instantly!

### Features:
1. **Click "Select Date"** button (with calendar icon 📅)
2. **Native date picker opens** - select ANY date
3. **Automatic week calculation** - the system finds the Monday-Sunday range for that week
4. **Week display updates** - shows the new week range

### Example:
- You select: **February 5, 2026** (a Thursday)
- System calculates: **Monday, February 2** to **Sunday, February 8**
- Week display shows: `Week: 2026-02-02 to 2026-02-08`

## Navigation Options

You now have **4 ways** to navigate weeks:

| Method | Icon | Action |
|--------|------|--------|
| **Previous Week** | ◀ | Go back 7 days |
| **Next Week** | ▶ | Go forward 7 days |
| **Select Date** | 📅 | Jump to any week via calendar |
| **Current Week** | Button | Jump to this week |

## Use Cases

### 1. Review Last Week's Performance
- Click **Previous Week** (◀)
- Review tasks and KPIs
- Export report for CEO

### 2. Plan Future Week
- Click **Select Date** (📅)
- Choose a date next week
- Pre-add tasks for planning

### 3. Check Historical Data
- Click **Select Date** (📅)
- Pick any past date
- Review old tasks and hours

### 4. Return to Current Week
- Click **Current Week**
- Instantly jump to today's week

## Technical Details

### Week Calculation Logic:
```typescript
// When you select any date:
const selectedDate = new Date(yourSelectedDate);
const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

// Calculate Monday (start of week)
const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
const monday = new Date(selectedDate);
monday.setDate(selectedDate.getDate() + daysToMonday);

// Calculate Sunday (end of week)
const sunday = new Date(monday);
sunday.setDate(monday.getDate() + 6);
```

### Data Persistence:
- Selected week is saved to localStorage
- Persists across page refreshes
- Each week's tasks are independent

## Tips

✅ **DO:**
- Use calendar for quick jumps to specific weeks
- Use arrows for sequential navigation
- Use "Current Week" to return to today

❌ **DON'T:**
- Worry about selecting the exact Monday - the system calculates it!
- Need to manually calculate week ranges
- Lose your place - it's all saved!

## Responsive Design

### Desktop:
- All controls in one row
- Calendar picker between arrows and "Current Week"

### Mobile:
- Stacked vertically
- Full-width buttons
- Easy touch targets

## Keyboard Accessibility

- **Tab** to navigate between controls
- **Enter/Space** to activate buttons
- **Arrow keys** in date picker (native browser behavior)

## Visual Feedback

- **Hover effects** on all buttons
- **Purple accents** on calendar icon
- **Smooth transitions** between weeks
- **Updated week display** shows current range

---

**Pro Tip:** Use the calendar picker at the start of each week to quickly navigate to the week you want to report on, then add your tasks and export the report for your CEO! 🚀
