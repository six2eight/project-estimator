import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style';
import './App.css';

interface Project {
  id: string;
  pageName: string;
  desktopMinHours: number;
  desktopMaxHours: number;
  mobileMinHours: number;
  mobileMaxHours: number;
}

function App() {
  // Load from localStorage or use defaults
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('projects');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [{ id: '1', pageName: '', desktopMinHours: 0, desktopMaxHours: 0, mobileMinHours: 0, mobileMaxHours: 0 }];
      }
    }
    return [{ id: '1', pageName: '', desktopMinHours: 0, desktopMaxHours: 0, mobileMinHours: 0, mobileMaxHours: 0 }];
  });

  const [projectTitle, setProjectTitle] = useState<string>(() => {
    return localStorage.getItem('projectTitle') || 'Project Estimate';
  });

  const totals = useMemo(() => {
    const desktopMin = projects.reduce((sum, p) => sum + (p.desktopMinHours || 0), 0);
    const desktopMax = projects.reduce((sum, p) => sum + (p.desktopMaxHours || 0), 0);
    const mobileMin = projects.reduce((sum, p) => sum + (p.mobileMinHours || 0), 0);
    const mobileMax = projects.reduce((sum, p) => sum + (p.mobileMaxHours || 0), 0);

    return {
      desktopMin,
      desktopMax,
      mobileMin,
      mobileMax,
      totalMin: desktopMin + mobileMin,
      totalMax: desktopMax + mobileMax
    };
  }, [projects]);

  // Save to localStorage whenever projects change
  useEffect(() => {
    localStorage.setItem('projects', JSON.stringify(projects));
  }, [projects]);

  // Save to localStorage whenever projectTitle changes
  useEffect(() => {
    localStorage.setItem('projectTitle', projectTitle);
  }, [projectTitle]);

  const addProject = () => {
    const newProject: Project = {
      id: Date.now().toString(),
      pageName: '',
      desktopMinHours: 0,
      desktopMaxHours: 0,
      mobileMinHours: 0,
      mobileMaxHours: 0
    };
    setProjects([...projects, newProject]);
  };

  const removeProject = (id: string) => {
    if (projects.length > 1) {
      setProjects(projects.filter(p => p.id !== id));
    }
  };

  const updateProject = (id: string, field: keyof Project, value: string | number) => {
    setProjects(projects.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const exportToExcel = () => {
    // Helper function to format hours
    const formatHours = (min: number, max: number): string => {
      if (min === 0 && max === 0) return '';

      // Handle minutes (values less than 1 hour)
      const formatValue = (val: number): string => {
        if (val === 0) return '0';
        if (val < 1) {
          const minutes = Math.round(val * 60);
          return `${minutes} min`;
        }
        // Remove .0 for whole numbers
        return val % 1 === 0 ? `${val}` : `${val}`;
      };

      const minStr = formatValue(min);
      const maxStr = formatValue(max);

      if (min === max) {
        return minStr.includes('min') ? minStr : `${minStr} hr`;
      }

      // For ranges, add hr at the end
      if (minStr.includes('min') || maxStr.includes('min')) {
        return `${minStr} - ${maxStr}`;
      }
      return `${minStr}- ${maxStr} hr`;
    };

    // Prepare data for export
    const exportData = projects.map(p => {
      const desktopRange = formatHours(p.desktopMinHours || 0, p.desktopMaxHours || 0);
      const mobileRange = formatHours(p.mobileMinHours || 0, p.mobileMaxHours || 0);

      const totalMin = (p.desktopMinHours || 0) + (p.mobileMinHours || 0);
      const totalMax = (p.desktopMaxHours || 0) + (p.mobileMaxHours || 0);
      const totalRange = formatHours(totalMin, totalMax);

      return {
        'Page Name/Task Name': p.pageName,
        'Desktop (Hours)': desktopRange,
        'Responsive (Hours)': mobileRange,
        'Total Range (Hours)': totalRange
      };
    });

    // Add blank row before totals
    exportData.push({
      'Page Name/Task Name': '',
      'Desktop (Hours)': '',
      'Responsive (Hours)': '',
      'Total Range (Hours)': ''
    });

    // Add totals row
    const desktopTotalRange = formatHours(totals.desktopMin, totals.desktopMax);
    const mobileTotalRange = formatHours(totals.mobileMin, totals.mobileMax);
    const overallTotalRange = formatHours(totals.totalMin, totals.totalMax);

    exportData.push({
      'Page Name/Task Name': 'TOTAL HOURS',
      'Desktop (Hours)': desktopTotalRange,
      'Responsive (Hours)': mobileTotalRange,
      'Total Range (Hours)': overallTotalRange
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    ws['!cols'] = [
      { wch: 35 }, // Page Name/Task Name
      { wch: 20 }, // Desktop (Hours)
      { wch: 20 }, // Responsive (Hours)
      { wch: 25 }  // Total Range (Hours)
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

    // Apply bold formatting to header row (row 1)
    const headerCells = ['A1', 'B1', 'C1', 'D1'];
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

    // Apply bold formatting to TOTAL HOURS row (last row)
    const totalRowNum = exportData.length + 1; // +1 because of header row
    const totalCells = [`A${totalRowNum}`, `B${totalRowNum}`, `C${totalRowNum}`, `D${totalRowNum}`];
    totalCells.forEach(cell => {
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

    // Truncate sheet name to 31 characters (Excel limit)
    const sheetName = (projectTitle || 'Project Estimate').substring(0, 31);

    // Create workbook with cellStyles enabled
    const wb = XLSX.utils.book_new();
    wb.Props = {
      Title: projectTitle || 'Project Estimate',
      Author: 'Project Estimator',
      CreatedDate: new Date()
    };
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${projectTitle.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.xlsx`;

    // Save file (xlsx-js-style automatically handles cell styles)
    XLSX.writeFile(wb, filename);
  };

  const clearAll = () => {
    if (window.confirm('Are you sure you want to clear all projects?')) {
      setProjects([{ id: '1', pageName: '', desktopMinHours: 0, desktopMaxHours: 0, mobileMinHours: 0, mobileMaxHours: 0 }]);
      setProjectTitle('Project Estimate');
    }
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header animate-fade-in">
          <div className="header-content">
            <div>
              <h1>Project Estimator</h1>
              <p className="text-secondary">Track and estimate project hours efficiently</p>
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
            <label htmlFor="project-title" className="title-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Project Title (for Excel export)
            </label>
            <input
              id="project-title"
              type="text"
              className="title-input"
              placeholder="Enter project title..."
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
            />
          </div>
        </header>

        <main className="main-content">
          <div className="card glass animate-slide-in">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '20%' }}>Page Name</th>
                    <th style={{ width: '13%' }}>Desktop Min</th>
                    <th style={{ width: '13%' }}>Desktop Max</th>
                    <th style={{ width: '13%' }}>Responsive Min</th>
                    <th style={{ width: '13%' }}>Responsive Max</th>
                    <th style={{ width: '18%' }}>Total Range</th>
                    <th style={{ width: '10%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project, index) => {
                    const totalMin = (project.desktopMinHours || 0) + (project.mobileMinHours || 0);
                    const totalMax = (project.desktopMaxHours || 0) + (project.mobileMaxHours || 0);
                    const totalRange = totalMin === totalMax ? `${totalMin}h` : `${totalMin}-${totalMax}h`;

                    return (
                      <tr key={project.id} style={{ animationDelay: `${index * 50}ms` }} className="table-row">
                        <td>
                          <input
                            type="text"
                            placeholder="Enter page name..."
                            value={project.pageName}
                            onChange={(e) => updateProject(project.id, 'pageName', e.target.value)}
                            className="input-full"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="Min"
                            value={project.desktopMinHours || ''}
                            onChange={(e) => updateProject(project.id, 'desktopMinHours', parseFloat(e.target.value) || 0)}
                            className="input-full"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="Max"
                            value={project.desktopMaxHours || ''}
                            onChange={(e) => updateProject(project.id, 'desktopMaxHours', parseFloat(e.target.value) || 0)}
                            className="input-full"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="Min"
                            value={project.mobileMinHours || ''}
                            onChange={(e) => updateProject(project.id, 'mobileMinHours', parseFloat(e.target.value) || 0)}
                            className="input-full"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="Max"
                            value={project.mobileMaxHours || ''}
                            onChange={(e) => updateProject(project.id, 'mobileMaxHours', parseFloat(e.target.value) || 0)}
                            className="input-full"
                          />
                        </td>
                        <td>
                          <div className="total-range-cell">{totalRange}</div>
                        </td>
                        <td>
                          <button
                            className="btn-icon"
                            onClick={() => removeProject(project.id)}
                            disabled={projects.length === 1}
                            title="Delete row"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="add-row-container">
              <button className="btn btn-secondary" onClick={addProject}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add Row
              </button>
            </div>
          </div>

          <div className="totals-section">
            <div className="totals-grid">
              <div className="total-card desktop-card">
                <div className="total-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <div className="total-content">
                  <div className="total-label">Desktop Hours</div>
                  <div className="total-value">
                    {totals.desktopMin === totals.desktopMax
                      ? totals.desktopMin.toFixed(1)
                      : `${totals.desktopMin.toFixed(1)}-${totals.desktopMax.toFixed(1)}`}
                  </div>
                </div>
              </div>

              <div className="total-card mobile-card">
                <div className="total-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                </div>
                <div className="total-content">
                  <div className="total-label">Mobile Hours</div>
                  <div className="total-value">
                    {totals.mobileMin === totals.mobileMax
                      ? totals.mobileMin.toFixed(1)
                      : `${totals.mobileMin.toFixed(1)}-${totals.mobileMax.toFixed(1)}`}
                  </div>
                </div>
              </div>

              <div className="total-card total-card-main">
                <div className="total-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div className="total-content">
                  <div className="total-label">Total Hours</div>
                  <div className="total-value total-value-main">
                    {totals.totalMin === totals.totalMax
                      ? totals.totalMin.toFixed(1)
                      : `${totals.totalMin.toFixed(1)}-${totals.totalMax.toFixed(1)}`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
