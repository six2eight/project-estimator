import './Navigation.css';

type PageType = 'estimator' | 'kpis' | 'resource';

interface NavigationProps {
    currentPage: PageType;
    onPageChange: (page: PageType) => void;
}

function Navigation({ currentPage, onPageChange }: NavigationProps) {
    return (
        <nav className="navigation">
            <div className="container">
                <div className="nav-content">
                    <div className="nav-brand">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            <path d="M9 12h6m-6 4h6" />
                        </svg>
                        <span className="nav-title">Project Estimator</span>
                    </div>

                    <div className="nav-links">
                        <button
                            className={`nav-link ${currentPage === 'estimator' ? 'active' : ''}`}
                            onClick={() => onPageChange('estimator')}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span>Project Estimator</span>
                        </button>

                        <button
                            className={`nav-link ${currentPage === 'kpis' ? 'active' : ''}`}
                            onClick={() => onPageChange('kpis')}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 3v18h18" />
                                <path d="M18 17V9M13 17V5M8 17v-3" />
                            </svg>
                            <span>KPIs Reports</span>
                        </button>

                        <button
                            className={`nav-link ${currentPage === 'resource' ? 'active' : ''}`}
                            onClick={() => onPageChange('resource')}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                            </svg>
                            <span>Resource Monitor</span>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default Navigation;
