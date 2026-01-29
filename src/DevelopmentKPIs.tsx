import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style';
import './DevelopmentKPIs.css';

interface DevelopmentTask {
    id: string;
    taskName: string;
    hoursLogged: number;
    dueDate: string;
    completedDate: string;
    isCompleted: boolean;
    isOnTime: boolean;
}

function DevelopmentKPIs() {
    const [currentWeekStart, setCurrentWeekStart] = useState<string>(() => {
        const saved = localStorage.getItem('devKPI_weekStart');
        if (saved) return saved;

        // Get current week's Monday
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        return monday.toISOString().split('T')[0];
    });

    const [tasks, setTasks] = useState<DevelopmentTask[]>(() => {
        const saved = localStorage.getItem('devKPI_tasks');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                return [];
            }
        }
        return [];
    });

    const [reportTitle, setReportTitle] = useState<string>(() => {
        return localStorage.getItem('devKPI_reportTitle') || 'Weekly Development Report';
    });

    // Calculate week end date (Sunday)
    const currentWeekEnd = useMemo(() => {
        const start = new Date(currentWeekStart);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return end.toISOString().split('T')[0];
    }, [currentWeekStart]);

    // Calculate KPIs
    const kpis = useMemo(() => {
        const totalHours = tasks.reduce((sum, task) => sum + (task.hoursLogged || 0), 0);
        const completedTasks = tasks.filter(task => task.isCompleted);
        const onTimeTasks = completedTasks.filter(task => task.isOnTime);
        const onTimePercentage = completedTasks.length > 0
            ? (onTimeTasks.length / completedTasks.length) * 100
            : 0;

        return {
            totalHours: totalHours.toFixed(1),
            completedTasksCount: completedTasks.length,
            totalTasksCount: tasks.length,
            onTimePercentage: onTimePercentage.toFixed(1)
        };
    }, [tasks]);

    // Save to localStorage
    useEffect(() => {
        localStorage.setItem('devKPI_tasks', JSON.stringify(tasks));
    }, [tasks]);

    useEffect(() => {
        localStorage.setItem('devKPI_weekStart', currentWeekStart);
    }, [currentWeekStart]);

    useEffect(() => {
        localStorage.setItem('devKPI_reportTitle', reportTitle);
    }, [reportTitle]);

    const addTask = () => {
        const newTask: DevelopmentTask = {
            id: Date.now().toString(),
            taskName: '',
            hoursLogged: 0,
            dueDate: currentWeekEnd,
            completedDate: '',
            isCompleted: false,
            isOnTime: false
        };
        setTasks([...tasks, newTask]);
    };

    const removeTask = (id: string) => {
        setTasks(tasks.filter(t => t.id !== id));
    };

    const updateTask = (id: string, field: keyof DevelopmentTask, value: string | number | boolean) => {
        setTasks(tasks.map(task => {
            if (task.id !== id) return task;

            const updatedTask = { ...task, [field]: value };

            // Auto-calculate isOnTime when task is marked as completed
            if (field === 'isCompleted' && value === true) {
                const completedDate = updatedTask.completedDate || new Date().toISOString().split('T')[0];
                updatedTask.completedDate = completedDate;
                updatedTask.isOnTime = completedDate <= updatedTask.dueDate;
            }

            // Recalculate isOnTime if dates change
            if ((field === 'completedDate' || field === 'dueDate') && updatedTask.isCompleted) {
                updatedTask.isOnTime = updatedTask.completedDate <= updatedTask.dueDate;
            }

            return updatedTask;
        }));
    };

    const exportToExcel = () => {
        // Prepare data for export
        const exportData = tasks.map(task => ({
            'Task Name': task.taskName,
            'Hours Logged': task.hoursLogged,
            'Due Date': task.dueDate,
            'Completed Date': task.completedDate || 'N/A',
            'Status': task.isCompleted ? 'Completed' : 'In Progress',
            'On Time': task.isCompleted ? (task.isOnTime ? 'Yes' : 'No') : 'N/A'
        }));

        // Add blank row
        exportData.push({
            'Task Name': '',
            'Hours Logged': '',
            'Due Date': '',
            'Completed Date': '',
            'Status': '',
            'On Time': ''
        } as any);

        // Add KPI summary
        exportData.push({
            'Task Name': 'TOTAL HOURS LOGGED',
            'Hours Logged': kpis.totalHours,
            'Due Date': '',
            'Completed Date': '',
            'Status': '',
            'On Time': ''
        } as any);

        exportData.push({
            'Task Name': 'ON-TIME COMPLETION RATE',
            'Hours Logged': `${kpis.onTimePercentage}%`,
            'Due Date': '',
            'Completed Date': '',
            'Status': `${kpis.completedTasksCount}/${kpis.totalTasksCount} tasks`,
            'On Time': ''
        } as any);

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Set column widths
        ws['!cols'] = [
            { wch: 35 }, // Task Name
            { wch: 15 }, // Hours Logged
            { wch: 15 }, // Due Date
            { wch: 18 }, // Completed Date
            { wch: 15 }, // Status
            { wch: 12 }  // On Time
        ];

        // Apply Arial font to all cells
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (ws[cellAddress]) {
                    if (!ws[cellAddress].s) ws[cellAddress].s = {};
                    ws[cellAddress].s.font = {
                        name: 'Arial',
                        sz: 11
                    };
                }
            }
        }

        // Apply bold formatting to header row
        const headerCells = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1'];
        headerCells.forEach(cell => {
            if (ws[cell]) {
                ws[cell].s = {
                    font: {
                        bold: true,
                        sz: 11,
                        name: 'Arial'
                    },
                    alignment: {
                        vertical: 'center',
                        horizontal: 'left'
                    }
                };
            }
        });

        // Apply bold formatting to summary rows
        const summaryStartRow = exportData.length - 1; // TOTAL HOURS LOGGED row
        for (let i = 0; i < 2; i++) {
            const rowNum = summaryStartRow + i;
            const summaryCells = [`A${rowNum}`, `B${rowNum}`, `C${rowNum}`, `D${rowNum}`, `E${rowNum}`, `F${rowNum}`];
            summaryCells.forEach(cell => {
                if (ws[cell]) {
                    ws[cell].s = {
                        font: {
                            bold: true,
                            sz: 11,
                            name: 'Arial'
                        },
                        alignment: {
                            vertical: 'center',
                            horizontal: 'left'
                        }
                    };
                }
            });
        }

        // Create workbook
        const sheetName = (reportTitle || 'Development Report').substring(0, 31);
        const wb = XLSX.utils.book_new();
        wb.Props = {
            Title: reportTitle || 'Development Report',
            Author: 'Project Estimator',
            CreatedDate: new Date()
        };
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        // Generate filename
        const filename = `${reportTitle.toLowerCase().replace(/\s+/g, '-')}-${currentWeekStart}.xlsx`;
        XLSX.writeFile(wb, filename);
    };

    const clearAll = () => {
        if (window.confirm('Are you sure you want to clear all tasks?')) {
            setTasks([]);
            setReportTitle('Weekly Development Report');
        }
    };

    const goToPreviousWeek = () => {
        const start = new Date(currentWeekStart);
        start.setDate(start.getDate() - 7);
        setCurrentWeekStart(start.toISOString().split('T')[0]);
    };

    const goToNextWeek = () => {
        const start = new Date(currentWeekStart);
        start.setDate(start.getDate() + 7);
        setCurrentWeekStart(start.toISOString().split('T')[0]);
    };

    const goToCurrentWeek = () => {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        setCurrentWeekStart(monday.toISOString().split('T')[0]);
    };

    return (
        <div className="dev-kpis">
            <header className="header animate-fade-in">
                <div className="header-content">
                    <div>
                        <h1>KPIs Reports</h1>
                        <p className="text-secondary">Track development hours and task completion metrics</p>
                    </div>
                    <div className="header-actions">
                        <button className="btn btn-secondary" onClick={clearAll}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                            Clear All
                        </button>
                        <button className="btn btn-primary" onClick={exportToExcel}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                            </svg>
                            Export to Excel
                        </button>
                    </div>
                </div>

                <div className="title-input-section">
                    <label htmlFor="report-title" className="title-label">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                        </svg>
                        Report Title (for Excel export)
                    </label>
                    <input
                        id="report-title"
                        type="text"
                        className="title-input"
                        placeholder="Enter report title..."
                        value={reportTitle}
                        onChange={(e) => setReportTitle(e.target.value)}
                    />
                </div>

                <div className="week-selector">
                    <button className="btn btn-icon" onClick={goToPreviousWeek} title="Previous Week">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <div className="week-display">
                        <span className="week-label">Week:</span>
                        <span className="week-dates">{currentWeekStart} to {currentWeekEnd}</span>
                    </div>
                    <button className="btn btn-icon" onClick={goToNextWeek} title="Next Week">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                    <div className="week-calendar-picker">
                        <label htmlFor="week-date-picker" className="calendar-label">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <span>Select Date</span>
                        </label>
                        <input
                            id="week-date-picker"
                            type="date"
                            className="calendar-input"
                            value={currentWeekStart}
                            onChange={(e) => {
                                if (e.target.value) {
                                    const selectedDate = new Date(e.target.value);
                                    const day = selectedDate.getDay();
                                    const diff = selectedDate.getDate() - day + (day === 0 ? -6 : 1);
                                    const monday = new Date(selectedDate.setDate(diff));
                                    setCurrentWeekStart(monday.toISOString().split('T')[0]);
                                }
                            }}
                        />
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={goToCurrentWeek}>
                        Current Week
                    </button>
                </div>
            </header>

            <main className="main-content">
                {/* KPI Cards */}
                <div className="kpi-cards-section">
                    <div className="kpi-cards-grid">
                        <div className="kpi-card kpi-card-hours">
                            <div className="kpi-icon">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                            </div>
                            <div className="kpi-content">
                                <div className="kpi-label">Development Hours Logged</div>
                                <div className="kpi-value">{kpis.totalHours}</div>
                                <div className="kpi-subtitle">Total hours this week</div>
                            </div>
                        </div>

                        <div className="kpi-card kpi-card-completion">
                            <div className="kpi-icon">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                            </div>
                            <div className="kpi-content">
                                <div className="kpi-label">On-Time Task Completion</div>
                                <div className="kpi-value">{kpis.onTimePercentage}%</div>
                                <div className="kpi-subtitle">{kpis.completedTasksCount} of {kpis.totalTasksCount} tasks completed</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tasks Table */}
                <div className="card glass animate-slide-in">
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: '25%' }}>Task Name</th>
                                    <th style={{ width: '12%' }}>Hours Logged</th>
                                    <th style={{ width: '13%' }}>Due Date</th>
                                    <th style={{ width: '13%' }}>Completed Date</th>
                                    <th style={{ width: '12%' }}>Completed</th>
                                    <th style={{ width: '12%' }}>On Time</th>
                                    <th style={{ width: '8%' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="empty-state">
                                            No tasks added yet. Click "Add Task" to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    tasks.map((task, index) => (
                                        <tr key={task.id} style={{ animationDelay: `${index * 50}ms` }} className="table-row">
                                            <td>
                                                <input
                                                    type="text"
                                                    placeholder="Enter task name..."
                                                    value={task.taskName}
                                                    onChange={(e) => updateTask(task.id, 'taskName', e.target.value)}
                                                    className="input-full"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    placeholder="0"
                                                    value={task.hoursLogged || ''}
                                                    onChange={(e) => updateTask(task.id, 'hoursLogged', parseFloat(e.target.value) || 0)}
                                                    className="input-full"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="date"
                                                    value={task.dueDate}
                                                    onChange={(e) => updateTask(task.id, 'dueDate', e.target.value)}
                                                    className="input-full"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="date"
                                                    value={task.completedDate}
                                                    onChange={(e) => updateTask(task.id, 'completedDate', e.target.value)}
                                                    className="input-full"
                                                    disabled={!task.isCompleted}
                                                />
                                            </td>
                                            <td>
                                                <div className="checkbox-container">
                                                    <input
                                                        type="checkbox"
                                                        id={`completed-${task.id}`}
                                                        checked={task.isCompleted}
                                                        onChange={(e) => updateTask(task.id, 'isCompleted', e.target.checked)}
                                                        className="checkbox-input"
                                                    />
                                                    <label htmlFor={`completed-${task.id}`} className="checkbox-label">
                                                        {task.isCompleted ? 'Yes' : 'No'}
                                                    </label>
                                                </div>
                                            </td>
                                            <td>
                                                <div className={`status-badge ${task.isCompleted ? (task.isOnTime ? 'status-success' : 'status-late') : 'status-pending'}`}>
                                                    {task.isCompleted ? (task.isOnTime ? 'On Time' : 'Late') : 'Pending'}
                                                </div>
                                            </td>
                                            <td>
                                                <button
                                                    className="btn-icon"
                                                    onClick={() => removeTask(task.id)}
                                                    title="Delete task"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M18 6L6 18M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="add-row-container">
                        <button className="btn btn-secondary" onClick={addTask}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            Add Task
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default DevelopmentKPIs;
