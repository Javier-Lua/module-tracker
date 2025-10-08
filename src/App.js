import React, { useState, useEffect } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const NUSModuleTracker = () => {
  const [modules, setModules] = useState([]);
  const [editingModule, setEditingModule] = useState(null);
  const [gpa, setGpa] = useState(0);
  const [totalMCs, setTotalMCs] = useState(0);
  const [filterSemester, setFilterSemester] = useState('All');
  const [filterFocusArea, setFilterFocusArea] = useState('All');
  const [targetGPA, setTargetGPA] = useState('');
  const [gpaSpeculation, setGpaSpeculation] = useState(null);
  const [expandedSemesters, setExpandedSemesters] = useState(new Set());

  const chartColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#ef4444', '#14b8a6', '#a855f7'];
  const semesterOptions = ['Semester 1', 'Semester 2', 'Special Term 1', 'Special Term 2'];
  const gradePoints = {
    'A+': 5.0, 'A': 5.0, 'A-': 4.5, 'B+': 4.0, 'B': 3.5, 'B-': 3.0,
    'C+': 2.5, 'C': 2.0, 'D+': 1.5, 'D': 1.0, 'F': 0.0, 'S': null, 'U': null
  };

  useEffect(() => {
    const savedModules = localStorage.getItem('nusModules');
    const savedExpanded = localStorage.getItem('expandedSemesters');
    
    if (savedModules) {
      setModules(JSON.parse(savedModules));
    }
    if (savedExpanded) {
      setExpandedSemesters(new Set(JSON.parse(savedExpanded)));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('nusModules', JSON.stringify(modules));
    localStorage.setItem('expandedSemesters', JSON.stringify([...expandedSemesters]));
    calculateGPA();
  }, [modules, expandedSemesters]);

  const calculateGPA = () => {
    let totalGradePoints = 0, totalGradedMCs = 0, mcCount = 0;
    modules.forEach(module => {
      mcCount += module.mc;
      if (module.grade && module.grade in gradePoints && gradePoints[module.grade] !== null) {
        totalGradePoints += gradePoints[module.grade] * module.mc;
        totalGradedMCs += module.mc;
      }
    });
    setTotalMCs(mcCount);
    setGpa(totalGradedMCs > 0 ? (totalGradePoints / totalGradedMCs).toFixed(2) : 0);
  };

  const calculateSemesterGPA = (semesterModules) => {
    let totalGradePoints = 0, totalGradedMCs = 0;
    semesterModules.forEach(module => {
      if (module.grade && module.grade in gradePoints && gradePoints[module.grade] !== null) {
        totalGradePoints += gradePoints[module.grade] * module.mc;
        totalGradedMCs += module.mc;
      }
    });
    return totalGradedMCs > 0 ? (totalGradePoints / totalGradedMCs).toFixed(2) : 'N/A';
  };

  const getModulesBySemester = (modulesList = modules) => {
    const grouped = {};
    modulesList.forEach(module => {
      if (!grouped[module.semester]) grouped[module.semester] = [];
      grouped[module.semester].push(module);
    });
    const sortedSemesters = Object.keys(grouped).sort((a, b) => {
      const getSemesterValue = (semester) => {
        const match = semester.match(/Year (\d+) (.*)/);
        if (match) {
          const year = parseInt(match[1]);
          const semType = match[2];
          let semWeight = 0;
          if (semType === 'Semester 1') semWeight = 1;
          else if (semType === 'Semester 2') semWeight = 2;
          else if (semType === 'Special Term 1') semWeight = 3;
          else if (semType === 'Special Term 2') semWeight = 4;
          return year * 10 + semWeight;
        }
        return 999;
      };
      return getSemesterValue(a) - getSemesterValue(b);
    });
    return { grouped, sortedSemesters };
  };

  const getAllFocusAreas = () => {
    const areas = new Set();
    modules.forEach(module => {
      if (module.focusArea && module.focusArea.trim() !== '' && module.focusArea !== 'None') {
        areas.add(module.focusArea);
      }
    });
    return ['All', ...Array.from(areas).sort()];
  };

  const toggleSemester = (semester) => {
    const newExpanded = new Set(expandedSemesters);
    if (newExpanded.has(semester)) newExpanded.delete(semester);
    else newExpanded.add(semester);
    setExpandedSemesters(newExpanded);
  };

  const expandAll = () => {
    const { sortedSemesters } = getModulesBySemester();
    setExpandedSemesters(new Set(sortedSemesters));
  };

  const collapseAll = () => setExpandedSemesters(new Set());

  const addModule = (module) => {
    const newModule = { ...module, id: modules.length > 0 ? Math.max(...modules.map(m => m.id)) + 1 : 1 };
    setModules([...modules, newModule]);
    setEditingModule(null); // Close the form after adding
  };

  const updateModule = (updatedModule) => {
    setModules(modules.map(module => module.id === updatedModule.id ? updatedModule : module));
    setEditingModule(null);
  };

  const deleteModule = (id) => setModules(modules.filter(module => module.id !== id));

  const handleCsvImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvData = e.target.result;
      const lines = csvData.split('\n').filter(line => line.trim());
      const importedModules = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(value => value.trim());
        return {
          id: modules.length + index + 1,
          semester: values[0],
          code: values[1],
          name: values[2],
          mc: parseInt(values[3]) || 4,
          focusArea: values[4] || '',
          workload: values[5] || '',
          grade: values[6] || ''
        };
      }).filter(module => module.code && module.name);
      setModules([...modules, ...importedModules]);
      alert(`Successfully imported ${importedModules.length} modules!`);
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  const exportToCSV = () => {
    const headers = ['Semester', 'Module Code', 'Module Name', 'MC', 'Focus Area(s)', 'Workload (hrs/week)', 'Grade'];
    const csvContent = [
      headers.join(','),
      ...modules.map(module => [module.semester, module.code, module.name, module.mc, module.focusArea, module.workload, module.grade || ''].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nus_modules.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const calculateGpaSpeculation = () => {
    const target = parseFloat(targetGPA);
    if (isNaN(target) || target < 0 || target > 5.0) {
      alert('Please enter a valid target GPA between 0 and 5.0');
      return;
    }
    let currentGradePoints = 0, currentMCs = 0, remainingMCs = 0;
    modules.forEach(module => {
      if (module.grade && module.grade in gradePoints && gradePoints[module.grade] !== null) {
        currentGradePoints += gradePoints[module.grade] * module.mc;
        currentMCs += module.mc;
      } else if (!module.grade || module.grade === 'S' || module.grade === 'U') {
        remainingMCs += module.mc;
      }
    });
    if (remainingMCs === 0) {
      const finalGPA = currentMCs > 0 ? (currentGradePoints / currentMCs) : 0;
      setGpaSpeculation({
        achievable: finalGPA >= target,
        message: currentMCs > 0 ? `No remaining modules. Final GPA: ${finalGPA.toFixed(2)}` : 'No graded modules found.'
      });
      return;
    }
    const totalMCsForGPA = currentMCs + remainingMCs;
    const requiredTotalGradePoints = target * totalMCsForGPA;
    const requiredRemainingGradePoints = requiredTotalGradePoints - currentGradePoints;
    const requiredAverageGradePerMC = requiredRemainingGradePoints / remainingMCs;
    const achievable = requiredAverageGradePerMC <= 5.0;
    let recommendedGrade = 'F';
    if (requiredAverageGradePerMC >= 5.0) recommendedGrade = 'A+';
    else if (requiredAverageGradePerMC >= 4.75) recommendedGrade = 'A';
    else if (requiredAverageGradePerMC >= 4.25) recommendedGrade = 'A-';
    else if (requiredAverageGradePerMC >= 3.75) recommendedGrade = 'B+';
    else if (requiredAverageGradePerMC >= 3.25) recommendedGrade = 'B';
    else if (requiredAverageGradePerMC >= 2.75) recommendedGrade = 'B-';
    else if (requiredAverageGradePerMC >= 2.25) recommendedGrade = 'C+';
    else if (requiredAverageGradePerMC >= 1.75) recommendedGrade = 'C';
    else if (requiredAverageGradePerMC >= 1.25) recommendedGrade = 'D+';
    else if (requiredAverageGradePerMC >= 0.75) recommendedGrade = 'D';
    setGpaSpeculation({
      currentMCs, remainingMCs,
      requiredAverageGradePerMC: requiredAverageGradePerMC.toFixed(2),
      recommendedGrade, achievable,
      message: achievable ? 
        `Target ${target} achievable. Need ${requiredAverageGradePerMC.toFixed(2)} pts/MC in ${remainingMCs} MCs (≈${recommendedGrade})` :
        `Target ${target} not achievable. Need ${requiredAverageGradePerMC.toFixed(2)} pts/MC (max 5.0)`
    });
  };

  const getUniqueSemesters = () => {
    const semesters = [...new Set(modules.map(module => module.semester))];
    return ['All', ...semesters.sort()];
  };

  const getFilteredModules = () => {
    let filtered = modules.filter(module => {
      const semesterMatch = filterSemester === 'All' || module.semester === filterSemester;
      const focusAreaMatch = filterFocusArea === 'All' || module.focusArea === filterFocusArea;
      return semesterMatch && focusAreaMatch;
    });
    if (filterSemester !== 'All' && !expandedSemesters.has(filterSemester)) {
      setExpandedSemesters(new Set([...expandedSemesters, filterSemester]));
    }
    return getModulesBySemester(filtered);
  };

  const getFocusAreaStats = () => {
    const stats = {};
    modules.forEach(module => {
      // Only include modules with non-empty focus areas
      if (module.focusArea && module.focusArea.trim() !== '' && module.focusArea !== 'None' && module.focusArea !== 'Uncategorized') {
        const area = module.focusArea;
        if (!stats[area]) stats[area] = { count: 0, mcs: 0 };
        stats[area].count += 1;
        stats[area].mcs += module.mc;
      }
    });
    return stats;
  };

  const getFocusAreaChartData = () => {
    const stats = getFocusAreaStats();
    const areas = Object.keys(stats);
    return {
      labels: areas,
      datasets: [{
        data: areas.map(area => stats[area].mcs),
        backgroundColor: areas.map((_, index) => chartColors[index % chartColors.length]),
        borderColor: '#fff',
        borderWidth: 2,
      }],
    };
  };

  const getWorkloadChartData = () => {
    const { grouped, sortedSemesters } = getModulesBySemester();
    const workloads = sortedSemesters.map(semester => {
      return grouped[semester].reduce((total, module) => total + (parseInt(module.workload) || 0), 0);
    });
    return {
      labels: sortedSemesters,
      datasets: [{
        label: 'Weekly Hours',
        data: workloads,
        backgroundColor: '#6366f1',
        borderRadius: 6,
      }],
    };
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 10,
          usePointStyle: true,
          font: { size: 11 },
          boxWidth: 12,
          boxHeight: 12
        },
      },
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };

  const getGradedStats = () => {
    let gradedCount = 0, suCount = 0;
    modules.forEach(module => {
      if (module.grade) {
        if (module.grade === 'S' || module.grade === 'U') suCount += 1;
        else if (module.grade in gradePoints && gradePoints[module.grade] !== null) gradedCount += 1;
      }
    });
    return { gradedCount, suCount };
  };

  const clearAllData = () => {
    if (window.confirm('Clear all data? This cannot be undone.')) {
      setModules([]);
      setExpandedSemesters(new Set());
      setGradRequirements(defaultRequirements);
      localStorage.removeItem('nusModules');
      localStorage.removeItem('expandedSemesters');
      localStorage.removeItem('gradRequirements');
    }
  };

  const addModuleToSemester = (semester) => {
    setEditingModule({ prefilledSemester: semester });
  };

  // Graduation Requirements Tracking
  const defaultRequirements = {
    totalMCs: 160,
    universityLevel: { ue: 20, ge: 0 },
    programCore: 0,
    programElectives: 0,
    focusAreaMCs: 0
  };

  const [gradRequirements, setGradRequirements] = useState(() => {
    const saved = localStorage.getItem('gradRequirements');
    return saved ? JSON.parse(saved) : defaultRequirements;
  });

  const [showRequirementsModal, setShowRequirementsModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('gradRequirements', JSON.stringify(gradRequirements));
  }, [gradRequirements]);

  const calculateGraduationProgress = () => {
    const ueModules = modules.filter(m => 
      m.code.startsWith('GE') || m.code.startsWith('UE') || 
      (m.focusArea && m.focusArea.toLowerCase().includes('unrestricted'))
    );
    const ueMCs = ueModules.reduce((sum, m) => sum + m.mc, 0);

    const geModules = modules.filter(m => m.code.startsWith('GE'));
    const geMCs = geModules.reduce((sum, m) => sum + m.mc, 0);

    const coreModules = modules.filter(m => 
      m.focusArea && (m.focusArea.toLowerCase().includes('core') || m.focusArea.toLowerCase().includes('foundation'))
    );
    const coreMCs = coreModules.reduce((sum, m) => sum + m.mc, 0);

    const electiveModules = modules.filter(m => 
      m.focusArea && m.focusArea.toLowerCase().includes('elective')
    );
    const electiveMCs = electiveModules.reduce((sum, m) => sum + m.mc, 0);

    const focusAreaModules = modules.filter(m => 
      m.focusArea && !m.focusArea.toLowerCase().includes('core') && 
      !m.focusArea.toLowerCase().includes('elective') && 
      !m.focusArea.toLowerCase().includes('unrestricted') &&
      m.focusArea.trim() !== '' && m.focusArea !== 'None'
    );
    const focusAreaMCs = focusAreaModules.reduce((sum, m) => sum + m.mc, 0);

    return {
      totalProgress: totalMCs,
      ueProgress: ueMCs,
      geProgress: geMCs,
      coreProgress: coreMCs,
      electiveProgress: electiveMCs,
      focusAreaProgress: focusAreaMCs
    };
  };

  const { gradedCount, suCount } = getGradedStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Module Tracker</h1>
          <p className="text-sm sm:text-base text-gray-600">Track modules, calculate GPA, plan your journey</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Modules</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{modules.length}</div>
          </div>
          <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Total MCs</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{totalMCs}</div>
          </div>
          <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Current GPA</div>
            <div className="text-xl sm:text-2xl font-bold text-indigo-600">{gpa}</div>
          </div>
          <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Graded</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{gradedCount}</div>
          </div>
          <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">S/U</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{suCount}</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Column - Modules List */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Filter and Actions */}
            <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <select 
                    value={filterSemester} 
                    onChange={(e) => setFilterSemester(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {getUniqueSemesters().map(sem => (
                      <option key={sem} value={sem}>{sem}</option>
                    ))}
                  </select>
                  <select 
                    value={filterFocusArea} 
                    onChange={(e) => setFilterFocusArea(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {getAllFocusAreas().map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                  <button 
                    onClick={() => setEditingModule({})} 
                    className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Add Module
                  </button>
                  <button 
                    onClick={exportToCSV} 
                    className="px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Export
                  </button>
                  <button 
                    onClick={expandAll} 
                    className="px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Expand
                  </button>
                  <button 
                    onClick={collapseAll} 
                    className="px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Collapse
                  </button>
                </div>
              </div>
            </div>

            {/* CSV Import */}
            <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Import CSV</h3>
              <label className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-200 transition-colors">
                Choose File
                <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
              </label>
              <p className="text-xs text-gray-500 mt-2">Format: Semester, Code, Name, MC, Focus Area, Workload, Grade</p>
            </div>

            {/* Modules List */}
            {getFilteredModules().sortedSemesters.length === 0 ? (
              <div className="bg-white rounded-lg p-8 sm:p-12 border border-gray-200 text-center">
                <p className="text-gray-500 text-sm sm:text-base">No modules found. Add some to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {getFilteredModules().sortedSemesters.map(semester => {
                  const semesterModules = getFilteredModules().grouped[semester];
                  const semesterMCs = semesterModules.reduce((total, module) => total + module.mc, 0);
                  const semesterGPA = calculateSemesterGPA(semesterModules);
                  const isExpanded = expandedSemesters.has(semester);
                  
                  return (
                    <div key={semester} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                        <div 
                          className="flex items-center gap-2 sm:gap-3 cursor-pointer flex-1" 
                          onClick={() => toggleSemester(semester)}
                        >
                          <span className="text-gray-400 text-sm">{isExpanded ? '▼' : '▶'}</span>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{semester}</h3>
                            <div className="flex gap-2 sm:gap-4 mt-1 flex-wrap">
                              <span className="text-xs text-gray-600">{semesterMCs} MCs</span>
                              {semesterGPA !== 'N/A' && (
                                <span className="text-xs text-gray-600">GPA: {semesterGPA}</span>
                              )}
                              <span className="text-xs text-gray-600">{semesterModules.length} modules</span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            addModuleToSemester(semester); 
                          }}
                          className="ml-2 w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex-shrink-0"
                          title="Add module to this semester"
                        >
                          <span className="text-lg leading-none">+</span>
                        </button>
                      </div>
                      
                      {isExpanded && (
                        <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 bg-gray-50 border-t border-gray-200">
                          <div className="grid gap-3">
                            {semesterModules.map(module => (
                              <ModuleCard 
                                key={module.id} 
                                module={module} 
                                onEdit={() => setEditingModule(module)}
                                onDelete={() => deleteModule(module.id)} 
                                gradePoints={gradePoints} 
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column - Charts and Tools */}
          <div className="space-y-4 sm:space-y-6">
            {/* Graduation Progress Tracker */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Graduation Progress</h3>
                <button 
                  onClick={() => setShowRequirementsModal(true)}
                  className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 transition-colors"
                >
                  Configure
                </button>
              </div>
              
              <GraduationProgressTracker 
                requirements={gradRequirements}
                progress={calculateGraduationProgress()}
              />
            </div>

            {/* GPA Goal Calculator */}
            <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">GPA Goal Calculator</h3>
              <div className="space-y-3">
                <input 
                  type="number" 
                  min="0" 
                  max="5.0" 
                  step="0.01" 
                  value={targetGPA}
                  onChange={(e) => setTargetGPA(e.target.value)} 
                  placeholder="Target GPA (e.g., 4.5)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
                <button 
                  onClick={calculateGpaSpeculation} 
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Calculate
                </button>
              </div>
              
              {gpaSpeculation && (
                <div className={`mt-4 p-4 rounded-lg text-sm ${
                  gpaSpeculation.achievable ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={gpaSpeculation.achievable ? 'text-green-800' : 'text-red-800'}>
                    {gpaSpeculation.message}
                  </p>
                  {gpaSpeculation.achievable && gpaSpeculation.remainingMCs > 0 && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <p className="text-xs text-green-700 space-y-1">
                        <div>Current: {gpaSpeculation.currentMCs} MCs</div>
                        <div>Remaining: {gpaSpeculation.remainingMCs} MCs</div>
                        <div>Required: {gpaSpeculation.requiredAverageGradePerMC} pts/MC</div>
                        <div>Target grade: {gpaSpeculation.recommendedGrade}</div>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Focus Areas Chart */}
            <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Focus Areas</h3>
              <div className="h-56 sm:h-64">
                {Object.keys(getFocusAreaStats()).length > 0 ? (
                  <Pie data={getFocusAreaChartData()} options={pieChartOptions} />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    No focus area data
                  </div>
                )}
              </div>
            </div>

            {/* Workload Chart */}
            <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Workload</h3>
              <div className="h-56 sm:h-64">
                {getWorkloadChartData().labels.length > 0 ? (
                  <Bar data={getWorkloadChartData()} options={barChartOptions} />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    No data
                  </div>
                )}
              </div>
            </div>

            {/* Clear All Data Button */}
            <button 
              onClick={clearAllData} 
              className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Clear All Data
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ModuleForm 
        module={editingModule} 
        onSave={editingModule && editingModule.id ? updateModule : addModule}
        onCancel={() => setEditingModule(null)} 
        semesterOptions={semesterOptions} 
      />

      <RequirementsModal 
        show={showRequirementsModal}
        requirements={gradRequirements}
        onSave={setGradRequirements}
        onClose={() => setShowRequirementsModal(false)}
      />
    </div>
  );
};

const GraduationProgressTracker = ({ requirements, progress }) => {
  const ProgressBar = ({ label, current, required, color = 'indigo', icon = '📚' }) => {
    const percentage = required > 0 ? Math.min((current / required) * 100, 100) : 0;
    const isComplete = current >= required;
    
    return (
      <div className="mb-5 group hover:transform hover:scale-[1.02] transition-all duration-300">
        <div className="flex items-center justify-between text-sm mb-2">
          <div className="flex items-center gap-2">
            <span className="text-base">{icon}</span>
            <span className="font-semibold text-gray-800">{label}</span>
          </div>
          <span className={`font-bold ${isComplete ? 'text-green-600' : 'text-gray-600'}`}>
            {current}/{required}
            {isComplete && <span className="ml-1">✅</span>}
          </span>
        </div>
        
        {/* Enhanced progress bar with gradient */}
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-3 rounded-full transition-all duration-1000 ease-out ${
              isComplete 
                ? 'bg-gradient-to-r from-green-400 to-green-500' 
                : `bg-gradient-to-r from-${color}-400 to-${color}-500`
            } shadow-sm`}
            style={{ 
              width: `${percentage}%`,
              transition: 'width 1s cubic-bezier(0.22, 0.61, 0.36, 1)'
            }}
          />
        </div>
        
        {/* Percentage indicator */}
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{percentage.toFixed(0)}% complete</span>
          <span>{isComplete ? 'Completed! 🎉' : `${required - current} MCs left`}</span>
        </div>
      </div>
    );
  };

  const totalPercentage = requirements.totalMCs > 0 
    ? Math.min((progress.totalProgress / requirements.totalMCs) * 100, 100) 
    : 0;

  // Enhanced overall progress with circular progress indicator
  return (
    <div className="space-y-6">
      {/* Main Progress Header with Circular Progress */}
      <div className="text-center p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
        <div className="relative inline-block mb-3">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#E0E7FF"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#4F46E5"
              strokeWidth="3"
              strokeDasharray={`${totalPercentage}, 100`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div>
              <div className="text-2xl font-bold text-indigo-600">{totalPercentage.toFixed(0)}%</div>
              <div className="text-xs text-gray-500">Overall</div>
            </div>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="text-lg font-bold text-gray-900">
            {progress.totalProgress} / {requirements.totalMCs} MCs
          </div>
          <div className="text-sm text-gray-600">
            {Math.max(0, requirements.totalMCs - progress.totalProgress)} MCs remaining
          </div>
        </div>
      </div>

      {/* Individual Progress Bars */}
      <div className="space-y-1">
        {requirements.universityLevel.ue > 0 && (
          <ProgressBar 
            label="Unrestricted Electives" 
            current={progress.ueProgress} 
            required={requirements.universityLevel.ue}
            color="blue"
            icon="🎯"
          />
        )}

        {requirements.universityLevel.ge > 0 && (
          <ProgressBar 
            label="General Education" 
            current={progress.geProgress} 
            required={requirements.universityLevel.ge}
            color="purple"
            icon="🌍"
          />
        )}

        {requirements.programCore > 0 && (
          <ProgressBar 
            label="Program Core" 
            current={progress.coreProgress} 
            required={requirements.programCore}
            color="indigo"
            icon="⚡"
          />
        )}

        {requirements.programElectives > 0 && (
          <ProgressBar 
            label="Program Electives" 
            current={progress.electiveProgress} 
            required={requirements.programElectives}
            color="pink"
            icon="🎨"
          />
        )}

        {requirements.focusAreaMCs > 0 && (
          <ProgressBar 
            label="Focus Areas" 
            current={progress.focusAreaProgress} 
            required={requirements.focusAreaMCs}
            color="emerald"
            icon="🎯"
          />
        )}
      </div>

      {/* Enhanced Tip Card */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="text-lg">💡</div>
          <div>
            <div className="font-semibold text-blue-800 text-sm mb-1">Pro Tip</div>
            <div className="text-xs text-blue-700 space-y-1">
              <div>Tag modules with keywords in Focus Area:</div>
              <div>• "Core" or "Foundation" for core modules</div>
              <div>• "Elective" for program electives</div>
              <div>• "Unrestricted" for UE modules</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RequirementsModal = ({ show, requirements, onSave, onClose }) => {
  const [formData, setFormData] = useState(requirements);

  useEffect(() => {
    setFormData(requirements);
  }, [requirements]);

  if (!show) return null;

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            Configure Graduation Requirements
          </h3>
          <p className="text-xs text-gray-500 mt-1">Set your degree requirements</p>
        </div>
        
        <div className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total MCs Required *
            </label>
            <input
              type="number"
              value={formData.totalMCs}
              onChange={(e) => setFormData({...formData, totalMCs: parseInt(e.target.value) || 0})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., 160"
            />
            <p className="text-xs text-gray-500 mt-1">Usually 120-180 MCs for most NUS degrees</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unrestricted Electives (UE) MCs
            </label>
            <input
              type="number"
              value={formData.universityLevel.ue}
              onChange={(e) => setFormData({
                ...formData, 
                universityLevel: {...formData.universityLevel, ue: parseInt(e.target.value) || 0}
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., 20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              General Education (GE) MCs
            </label>
            <input
              type="number"
              value={formData.universityLevel.ge}
              onChange={(e) => setFormData({
                ...formData, 
                universityLevel: {...formData.universityLevel, ge: parseInt(e.target.value) || 0}
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., 0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Program Core/Foundation MCs
            </label>
            <input
              type="number"
              value={formData.programCore}
              onChange={(e) => setFormData({...formData, programCore: parseInt(e.target.value) || 0})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., 48"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Program Electives MCs
            </label>
            <input
              type="number"
              value={formData.programElectives}
              onChange={(e) => setFormData({...formData, programElectives: parseInt(e.target.value) || 0})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., 32"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Focus Area(s) MCs
            </label>
            <input
              type="number"
              value={formData.focusAreaMCs}
              onChange={(e) => setFormData({...formData, focusAreaMCs: parseInt(e.target.value) || 0})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., 20"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Pro Tip:</strong> Use keywords in the Focus Area field when adding modules:
              <br/>• "Core" or "Foundation" for core modules
              <br/>• "Elective" for program electives
              <br/>• "Unrestricted" for UE modules
              <br/>• Specific focus area names (e.g., "AI", "Algorithms")
            </p>
          </div>
        </div>
        
        <div className="flex gap-3 p-4 sm:p-6 border-t border-gray-200">
          <button 
            onClick={onClose} 
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Save Requirements
          </button>
        </div>
      </div>
    </div>
  );
};

const ModuleForm = ({ module, onSave, onCancel, semesterOptions }) => {
  const [formData, setFormData] = useState({
    year: '', semesterPart: 'Semester 1', code: '', name: '', mc: 4, focusArea: '', workload: '', grade: ''
  });

  useEffect(() => {
    if (module) {
      if (module.id) {
        const semesterMatch = module.semester.match(/Year (\d+) (.+)/);
        if (semesterMatch) {
          setFormData({ ...module, year: semesterMatch[1], semesterPart: semesterMatch[2], focusArea: module.focusArea || '' });
        } else {
          setFormData({ ...module, year: '', semesterPart: 'Semester 1', focusArea: module.focusArea || '' });
        }
      } else if (module.prefilledSemester) {
        const semesterMatch = module.prefilledSemester.match(/Year (\d+) (.+)/);
        if (semesterMatch) {
          setFormData({ year: semesterMatch[1], semesterPart: semesterMatch[2], code: '', name: '', mc: 4, focusArea: '', workload: '', grade: '' });
        } else {
          setFormData({ year: '', semesterPart: 'Semester 1', code: '', name: '', mc: 4, focusArea: '', workload: '', grade: '' });
        }
      } else {
        setFormData({ year: '', semesterPart: 'Semester 1', code: '', name: '', mc: 4, focusArea: '', workload: '', grade: '' });
      }
    }
  }, [module]);

  if (!module) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const yearNum = parseInt(formData.year);
    if (!formData.year || isNaN(yearNum) || yearNum < 1 || yearNum > 6) {
      alert('Please enter a valid year between 1 and 6');
      return;
    }
    if (!formData.code || !formData.name) {
      alert('Please fill in all required fields');
      return;
    }
    const semester = `Year ${formData.year} ${formData.semesterPart}`;
    onSave({ ...formData, semester: semester, focusArea: formData.focusArea || '' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            {module.id ? 'Edit Module' : 'Add New Module'}
          </h3>
        </div>
        
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
              <input type="number" min="1" max="6" placeholder="1-6" value={formData.year}
                onChange={(e) => setFormData({...formData, year: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
              <select value={formData.semesterPart} onChange={(e) => setFormData({...formData, semesterPart: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
                {semesterOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Module Code *</label>
              <input type="text" placeholder="CS3230" value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MCs *</label>
              <select value={formData.mc} onChange={(e) => setFormData({...formData, mc: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {[1,2,3,4,5,6,8,10,12].map(mc => <option key={mc} value={mc}>{mc}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Module Name *</label>
              <input type="text" placeholder="Design & Analysis of Algorithms" value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Focus Area</label>
              <input type="text" placeholder="e.g., Algorithms & Theory" value={formData.focusArea}
                onChange={(e) => setFormData({...formData, focusArea: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Workload (hrs/week)</label>
              <input type="text" placeholder="10" value={formData.workload}
                onChange={(e) => setFormData({...formData, workload: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
              <select value={formData.grade} onChange={(e) => setFormData({...formData, grade: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">No Grade</option>
                <option value="A+">A+ (5.0)</option>
                <option value="A">A (5.0)</option>
                <option value="A-">A- (4.5)</option>
                <option value="B+">B+ (4.0)</option>
                <option value="B">B (3.5)</option>
                <option value="B-">B- (3.0)</option>
                <option value="C+">C+ (2.5)</option>
                <option value="C">C (2.0)</option>
                <option value="D+">D+ (1.5)</option>
                <option value="D">D (1.0)</option>
                <option value="F">F (0.0)</option>
                <option value="S">S (Not in GPA)</option>
                <option value="U">U (Not in GPA)</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-3 mt-6 justify-end">
            <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              {module.id ? 'Update' : 'Add'} Module
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ModuleCard = ({ module, onEdit, onDelete, gradePoints }) => {
  const getGradeColor = (grade) => {
    if (!grade) return 'text-gray-400';
    if (grade === 'S' || grade === 'U') return 'text-gray-600';
    if (grade.startsWith('A')) return 'text-green-600';
    if (grade.startsWith('B')) return 'text-blue-600';
    if (grade.startsWith('C')) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 hover:border-indigo-300 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 mr-2">
          <div className="font-semibold text-gray-900 text-sm sm:text-base">{module.code}</div>
          <div className="text-xs sm:text-sm text-gray-600 truncate">{module.name}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">
            {module.mc} MC
          </span>
          {module.grade && (
            <span className={`px-2 py-1 bg-gray-50 rounded text-xs font-medium ${getGradeColor(module.grade)}`}>
              {module.grade}
            </span>
          )}
        </div>
      </div>
      
      <div className="text-xs text-gray-500 space-y-1 mb-3">
        {module.focusArea && <div className="truncate">{module.focusArea}</div>}
        {module.workload && <div>Workload: {module.workload} hrs/week</div>}
      </div>
      
      <div className="flex gap-2">
        <button onClick={onEdit} className="text-xs px-3 py-1.5 text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50 transition-colors">
          Edit
        </button>
        <button onClick={onDelete} className="text-xs px-3 py-1.5 text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
};

export default NUSModuleTracker;