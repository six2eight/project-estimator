# 📊 Project Estimator

A beautiful, modern React-based project estimation tool for tracking desktop and mobile development hours with Excel export functionality.

![Project Estimator](https://img.shields.io/badge/React-18.3-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.0-purple?logo=vite)

## ✨ Features

- **📝 Dynamic Project Tracking**: Add unlimited project rows with comprehensive estimation fields
  - Page names
  - Desktop hours with range estimates (e.g., "10-12 hours")
  - Mobile hours with range estimates (e.g., "4-8 hours")
  - Total range for overall project estimation
- **🧮 Real-time Calculations**: Automatic calculation of totals for desktop, mobile, and combined hours
- **📤 Excel Export**: Export your estimates to professionally formatted Excel spreadsheets with a single click
- **🎨 Premium Dark UI**: Modern, beautiful dark mode interface with smooth animations and glassmorphism effects
- **📱 Fully Responsive**: Works seamlessly on desktop, tablet, and mobile devices
- **⚡ Lightning Fast**: Built with Vite for optimal performance
- **♿ Accessible**: Keyboard navigation and screen reader friendly

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm installed on your system

### Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd project-estimator
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:5173`

## 📖 Usage

### Adding Projects

1. Click the **"Add Row"** button to add a new project entry
2. Fill in the following fields:
   - **Page Name**: Name of the page or feature
   - **Desktop Hours**: Estimated hours for desktop development
   - **Desktop Range**: Range estimate for desktop (e.g., "10-12")
   - **Mobile Hours**: Estimated hours for mobile development
   - **Mobile Range**: Range estimate for mobile (e.g., "4-8")
   - **Total Range**: Optional overall range estimate (e.g., "14-20 hours")

### Viewing Totals

The application automatically calculates and displays:
- **Desktop Hours**: Sum of all desktop hours
- **Mobile Hours**: Sum of all mobile hours
- **Total Hours**: Combined sum of desktop and mobile hours

### Exporting to Excel

1. Click the **"Export to Excel"** button in the header
2. The file will be automatically downloaded with the filename format: `project-estimate-YYYY-MM-DD.xlsx`
3. The exported file includes:
   - All project entries with their details
   - Calculated total hours per row
   - Summary totals row at the bottom

### Managing Projects

- **Delete a row**: Click the ❌ icon in the Actions column
- **Clear all**: Click the "Clear All" button (requires confirmation)

## 🛠️ Tech Stack

- **React 18.3** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **XLSX** - Excel file generation
- **CSS3** - Modern styling with custom properties

## 📁 Project Structure

```
project-estimator/
├── src/
│   ├── App.tsx          # Main application component
│   ├── App.css          # Component-specific styles
│   ├── index.css        # Global styles and design system
│   └── main.tsx         # Application entry point
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## 🎨 Design System

The application features a premium dark mode design with:

- **Color Palette**: Vibrant purple gradients with carefully crafted HSL colors
- **Typography**: Inter font family for modern, clean text
- **Animations**: Smooth transitions and micro-interactions
- **Glassmorphism**: Frosted glass effects for depth
- **Responsive Grid**: Adaptive layouts for all screen sizes

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 📊 Excel Export Format

The exported Excel file includes the following columns:

| Column | Description |
|--------|-------------|
| Page Name | Name of the page/feature |
| Desktop Hours | Desktop development hours |
| Desktop Range | Desktop hours range estimate |
| Mobile Hours | Mobile development hours |
| Mobile Range | Mobile hours range estimate |
| Total Range | Overall estimated range |
| Total Hours | Sum of desktop + mobile hours |

The last row contains the totals for all numeric columns.

## 🌟 Key Features Explained

### Real-time Calculations

All totals are calculated using React's `useMemo` hook for optimal performance. Changes to any hour field immediately update the totals display.

### Excel Export

The XLSX library is used to generate properly formatted Excel files with:
- Auto-sized columns for readability
- Professional formatting
- Timestamped filenames
- Summary totals row

### Responsive Design

The application uses CSS Grid and Flexbox for responsive layouts that adapt to:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (< 768px)

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📝 License

This project is open source and available under the MIT License.

## 🎯 Future Enhancements

Potential features for future versions:
- [ ] Save/load projects from local storage
- [ ] Multiple project templates
- [ ] Hourly rate calculations
- [ ] PDF export
- [ ] Dark/light theme toggle
- [ ] Project categories and filtering
- [ ] Import from Excel

---

Built with ❤️ using React and TypeScript
