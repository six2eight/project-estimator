import { useState, useEffect } from 'react';
import Navigation from './Navigation';
import ProjectEstimator from './ProjectEstimator';
import DevelopmentKPIs from './DevelopmentKPIs';
import './App.css';

type PageType = 'estimator' | 'kpis';

function App() {
    const [currentPage, setCurrentPage] = useState<PageType>(() => {
        const saved = localStorage.getItem('currentPage');
        return (saved as PageType) || 'estimator';
    });

    useEffect(() => {
        localStorage.setItem('currentPage', currentPage);
    }, [currentPage]);

    const handlePageChange = (page: PageType) => {
        setCurrentPage(page);
    };

    return (
        <div className="app-wrapper">
            <Navigation currentPage={currentPage} onPageChange={handlePageChange} />
            <div className="page-container">
                {currentPage === 'estimator' ? <ProjectEstimator /> : <DevelopmentKPIs />}
            </div>
        </div>
    );
}

export default App;
