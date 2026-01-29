# 📊 Project Estimator & Development KPIs

A beautiful, modern React-based application for tracking project estimates and development KPIs with Excel export functionality.

![Project Estimator](https://img.shields.io/badge/React-18.3-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.0-purple?logo=vite)

## ✨ Features

### 📝 Project Estimator
- **Dynamic Project Tracking**: Add unlimited project rows with comprehensive estimation fields
  - Page names
  - Desktop hours with min/max range estimates
  - Mobile hours with min/max range estimates
  - Auto-calculated total range for overall project estimation
- **Real-time Calculations**: Automatic calculation of totals for desktop, mobile, and combined hours
- **Excel Export**: Export your estimates to professionally formatted Excel spreadsheets
- **Custom Project Titles**: Name your projects for organized exports

### 📊 Development KPIs (NEW!)
- **Development Hours Logged**: Track total hours logged to development tasks for the week
- **On-Time Task Completion**: Monitor percentage of tasks completed by their due date
- **Weekly Navigation**: Easily switch between weeks to track historical data
- **Task Management**: 
  - Add/remove development tasks
  - Log hours per task
  - Set due dates and completion dates
  - Auto-calculate on-time status
- **Excel Reports**: Export weekly development reports to Excel with KPI summaries

### 🎨 Premium Features
- **Modern Dark UI**: Beautiful dark mode interface with smooth animations and glassmorphism effects
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Navigation System**: Easy switching between Project Estimator and Development KPIs
- **Data Persistence**: All data saved to localStorage automatically
- **Accessible**: Keyboard navigation and screen reader friendly

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm installed on your system

### Installation

1. **Navigate to the project directory**:
   ```bash
   cd project-estimator
   ```

2. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:5173`

## 📖 Usage

### Navigation

Use the top navigation bar to switch between:
- **Project Estimator**: For estimating project hours
- **Development KPIs**: For tracking development metrics

---

### Project Estimator

#### Adding Projects

1. Click the **"Add Row"** button to add a new project entry
2. Fill in the following fields:
   - **Page Name**: Name of the page or feature
   - **Desktop Min/Max**: Minimum and maximum hours for desktop development
   - **Responsive Min/Max**: Minimum and maximum hours for mobile development
   - **Total Range**: Auto-calculated overall range estimate

#### Viewing Totals

The application automatically calculates and displays:
- **Desktop Hours**: Sum of all desktop hours (min-max range)
- **Mobile Hours**: Sum of all mobile hours (min-max range)
- **Total Hours**: Combined sum with gradient styling

#### Exporting to Excel

1. Enter a **Project Title** in the input field
2. Click the **"Export to Excel"** button
3. The file will be downloaded with format: `project-title-YYYY-MM-DD.xlsx`
4. The exported file includes:
   - All project entries with their details
   - Formatted hour ranges (e.g., "8-10 hr")
   - Bold headers and totals row
   - Professional Arial font formatting

#### Managing Projects

- **Delete a row**: Click the ❌ icon in the Actions column
- **Clear all**: Click the "Clear All" button (requires confirmation)

---

### Development KPIs

#### Week Selection

- Use the **arrow buttons** to navigate between weeks
- Click **"Current Week"** to jump to the present week
- Week range is displayed (Monday to Sunday)

#### Adding Tasks

1. Click the **"Add Task"** button
2. Fill in the task details:
   - **Task Name**: Name of the development task
   - **Hours Logged**: Time spent on the task
   - **Due Date**: When the task should be completed
   - **Completed Date**: When the task was actually completed
   - **Completed**: Check when task is done
   - **On Time**: Auto-calculated based on dates

#### Viewing KPIs

Two main KPI cards display:

1. **Development Hours Logged**
   - Total hours logged for all tasks in the current week
   - Purple gradient styling

2. **On-Time Task Completion**
   - Percentage of completed tasks that were finished on time
   - Green gradient styling
   - Shows completed/total task count

#### Task Status

Tasks are automatically marked with status badges:
- **On Time** (Green): Completed by or before due date
- **Late** (Red): Completed after due date
- **Pending** (Yellow): Not yet completed

#### Exporting Reports

1. Enter a **Report Title** in the input field
2. Click the **"Export to Excel"** button
3. The file will be downloaded with format: `report-title-YYYY-MM-DD.xlsx`
4. The exported file includes:
   - All tasks with their details
   - Status and on-time indicators
   - KPI summary rows:
     - Total Hours Logged
     - On-Time Completion Rate

#### Managing Tasks

- **Delete a task**: Click the ❌ icon in the Actions column
- **Clear all**: Click the "Clear All" button (requires confirmation)

---

## 🛠️ Tech Stack

- **React 18.3** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **XLSX-JS-Style** - Excel file generation with formatting
- **CSS3** - Modern styling with custom properties

## 📁 Project Structure

```
project-estimator/
├── src/
│   ├── App.tsx                    # Main app with navigation
│   ├── App.css                    # App wrapper styles
│   ├── Navigation.tsx             # Navigation component
│   ├── Navigation.css             # Navigation styles
│   ├── ProjectEstimator.tsx       # Project estimator page
│   ├── ProjectEstimator.css       # Project estimator styles
│   ├── DevelopmentKPIs.tsx        # Development KPIs page
│   ├── DevelopmentKPIs.css        # Development KPIs styles
│   ├── index.css                  # Global styles and design system
│   └── main.tsx                   # Application entry point
├── index.html                     # HTML template
├── package.json                   # Dependencies and scripts
└── README.md                      # This file
```

## 🎨 Design System

The application features a premium dark mode design with:

- **Color Palette**: Vibrant purple and green gradients with carefully crafted HSL colors
- **Typography**: Inter font family for modern, clean text
- **Animations**: Smooth transitions and micro-interactions
- **Glassmorphism**: Frosted glass effects for depth
- **Responsive Grid**: Adaptive layouts for all screen sizes
- **Sticky Navigation**: Always accessible navigation bar

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 📊 Excel Export Formats

### Project Estimator Export

| Column | Description |
|--------|-------------|
| Page Name/Task Name | Name of the page/feature |
| Desktop (Hours) | Desktop hours range (e.g., "8-10 hr") |
| Responsive (Hours) | Mobile hours range (e.g., "4-6 hr") |
| Total Range (Hours) | Overall estimated range |

The last row contains "TOTAL HOURS" with summed ranges.

### Development KPIs Export

| Column | Description |
|--------|-------------|
| Task Name | Name of the development task |
| Hours Logged | Time spent on the task |
| Due Date | Task deadline |
| Completed Date | When task was finished |
| Status | Completed or In Progress |
| On Time | Yes/No/N/A |

Summary rows include:
- **TOTAL HOURS LOGGED**: Sum of all hours
- **ON-TIME COMPLETION RATE**: Percentage and task count

## 🌟 Key Features Explained

### Real-time Calculations

All totals and KPIs are calculated using React's `useMemo` hook for optimal performance. Changes to any field immediately update the displays.

### Excel Export with Formatting

The XLSX-JS-Style library is used to generate properly formatted Excel files with:
- Auto-sized columns for readability
- Bold headers and summary rows
- Arial font throughout
- Professional formatting
- Timestamped filenames

### Data Persistence

All data is automatically saved to localStorage:
- Project estimates
- Development tasks
- Current page selection
- Week selection
- Report titles

### Responsive Design

The application uses CSS Grid and Flexbox for responsive layouts that adapt to:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (< 768px)

## 📈 Use Cases

### For Project Managers
- Estimate project timelines with min/max ranges
- Export estimates for client presentations
- Track historical estimates

### For Development Teams
- Log weekly development hours
- Monitor on-time task completion
- Generate weekly reports for stakeholders
- Track team productivity metrics

### For CEOs/Stakeholders
- Review weekly development KPIs
- Monitor team efficiency
- Track project progress
- Export professional reports

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📝 License

This project is open source and available under the MIT License.

## 🎯 Future Enhancements

Potential features for future versions:
- [ ] Multiple project templates
- [ ] Hourly rate calculations
- [ ] PDF export
- [ ] Dark/light theme toggle
- [ ] Project categories and filtering
- [ ] Import from Excel
- [ ] Team member assignment
- [ ] Email report scheduling
- [ ] Dashboard with charts and graphs
- [ ] Historical trend analysis

---

Built with ❤️ using React and TypeScript

## 🆕 What's New in v2.0

### Development KPIs Section
- Added comprehensive Development KPIs tracking page
- Weekly navigation system for historical data
- Two key metrics:
  1. Development Hours Logged
  2. On-Time Task Completion (%)
- Task management with status tracking
- Professional Excel export for weekly reports

### Navigation System
- New sticky navigation bar
- Seamless page switching
- Glassmorphism effects
- Responsive mobile menu

### Enhanced Design
- Premium KPI cards with gradient styling
- Status badges for task completion
- Week selector with intuitive controls
- Improved accessibility and UX
