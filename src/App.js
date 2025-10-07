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

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

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

  const chartColors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
    '#06b6d4', '#f97316', '#ef4444', '#14b8a6', '#a855f7'
  ];

  const semesterOptions = ['Semester 1', 'Semester 2', 'Special Term 1', 'Special Term 2'];

  const gradePoints = {
    'A+': 5.0, 'A': 5.0, 'A-': 4.5,
    'B+': 4.0, 'B': 3.5, 'B-': 3.0,
    'C+': 2.5, 'C': 2.0, 'D+': 1.5,
    'D': 1.0, 'F': 0.0,
    'S': null, 'U': null
  };

  useEffect(() => {
    const savedModules = localStorage.getItem('nusModules');
    const savedExpanded = localStorage.getItem('expandedSemesters');
    
    if (savedModules) {
      setModules(JSON.parse(savedModules));
    } else {
      const sampleData = [
        { id: 1, semester: 'Year 2 Semester 2', code: 'CS3230', name: 'Design & Analysis of Algorithms', mc: 4, focusArea: 'Algorithms & Theory', workload: 10, grade: '' },
        { id: 2, semester: 'Year 2 Semester 2', code: 'CS2102', name: 'Database Systems', mc: 4, focusArea: 'Database Systems', workload: 8, grade: '' },
        { id: 3, semester: 'Year 3 Semester 1', code: 'CS3244', name: 'Machine Learning', mc: 4, focusArea: 'Artificial Intelligence', workload: 10, grade: '' }
      ];
      setModules(sampleData);
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
    let totalGradePoints = 0;
    let totalGradedMCs = 0;
    let mcCount = 0;

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
    let totalGradePoints = 0;
    let totalGradedMCs = 0;

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
      if (!grouped[module.semester]) {
        grouped[module.semester] = [];
      }
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
      if (module.focusArea && module.focusArea.trim() !== '') {
        areas.add(module.focusArea);
      }
    });
    return ['All', ...Array.from(areas).sort()];
  };

  const toggleSemester = (semester) => {
    const newExpanded = new Set(expandedSemesters);
    if (newExpanded.has(semester)) {
      newExpanded.delete(semester);
    } else {
      newExpanded.add(semester);
    }
    setExpandedSemesters(newExpanded);
  };

  const expandAll = () => {
    const { sortedSemesters } = getModulesBySemester();
    setExpandedSemesters(new Set(sortedSemesters));
  };

  const collapseAll = () => {
    setExpandedSemesters(new Set());
  };

  const addModule = (module) => {
    const newModule = {
      ...module,
      id: modules.length > 0 ? Math.max(...modules.map(m => m.id)) + 1 : 1
    };
    setModules([...modules, newModule]);
  };

  const updateModule = (updatedModule) => {
    setModules(modules.map(module => 
      module.id === updatedModule.id ? updatedModule : module
    ));
    setEditingModule(null);
  };

  const deleteModule = (id) => {
    setModules(modules.filter(module => module.id !== id));
  };

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
          focusArea: values[4] || 'None',
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
      ...modules.map(module => [
        module.semester,
        module.code,
        module.name,
        module.mc,
        module.focusArea,
        module.workload,
        module.grade || ''
      ].join(','))
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

    let currentGradePoints = 0;
    let currentMCs = 0;
    let remainingMCs = 0;

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
        message: currentMCs > 0 ? 
          `You have no remaining modules that affect GPA. Your final GPA is ${finalGPA.toFixed(2)}` :
          'No modules with grades that affect GPA found.'
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
      currentMCs,
      remainingMCs,
      requiredAverageGradePerMC: requiredAverageGradePerMC.toFixed(2),
      recommendedGrade,
      achievable,
      requiredRemainingGradePoints: requiredRemainingGradePoints.toFixed(2),
      message: achievable ? 
        `To achieve ${target} GPA, average ${requiredAverageGradePerMC.toFixed(2)} grade points per MC in remaining ${remainingMCs} MCs (≈${recommendedGrade} grades)` :
        `Target GPA of ${target} is not achievable. Would need ${requiredAverageGradePerMC.toFixed(2)} grade points per MC (max 5.0).`
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
      const area = module.focusArea || 'Uncategorized';
      if (!stats[area]) stats[area] = { count: 0, mcs: 0 };
      stats[area].count += 1;
      stats[area].mcs += module.mc;
    });
    return stats;
  };

  const getFocusAreaChartData = () => {
    const stats = getFocusAreaStats();
    const areas = Object.keys(stats);
    
    return {
      labels: areas,
      datasets: [
        {
          data: areas.map(area => stats[area].mcs),
          backgroundColor: areas.map((_, index) => chartColors[index % chartColors.length]),
          borderColor: '#fff',
          borderWidth: 2,
        },
      ],
    };
  };

  const getWorkloadChartData = () => {
    const { grouped, sortedSemesters } = getModulesBySemester();
    
    const workloads = sortedSemesters.map(semester => {
      const semesterModules = grouped[semester];
      return semesterModules.reduce((total, module) => {
        const workload = parseInt(module.workload) || 0;
        return total + workload;
      }, 0);
    });

    return {
      labels: sortedSemesters,
      datasets: [
        {
          label: 'Weekly Hours',
          data: workloads,
          backgroundColor: '#6366f1',
          borderRadius: 6,
        },
      ],
    };
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          usePointStyle: true,
          font: { size: 12 }
        },
      },
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        ticks: { font: { size: 11 } }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } }
      },
    },
  };

  const getGradedStats = () => {
    let gradedCount = 0;
    let suCount = 0;
    
    modules.forEach(module => {
      if (module.grade) {
        if (module.grade === 'S' || module.grade === 'U') {
          suCount += 1;
        } else if (module.grade in gradePoints && gradePoints[module.grade] !== null) {
          gradedCount += 1;
        }
      }
    });
    
    return { gradedCount, suCount };
  };

  const clearAllData = () => {
    if (window.confirm('Clear all module data? This cannot be undone.')) {
      setModules([]);
      setExpandedSemesters(new Set());
      localStorage.removeItem('nusModules');
      localStorage.removeItem('expandedSemesters');
    }
  };

  const { gradedCount, suCount } = getGradedStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Module Tracker</h1>
          <p className="text-gray-600">Track modules, calculate GPA, and plan your journey</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Modules</div>
            <div className="text-2xl font-bold text-gray-900">{modules.length}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Total MCs</div>
            <div className="text-2xl font-bold text-gray-900">{totalMCs}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Current GPA</div>
            <div className="text-2xl font-bold text-indigo-600">{gpa}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Graded</div>
            <div className="text-2xl font-bold text-gray-900">{gradedCount}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">S/U</div>
            <div className="text-2xl font-bold text-gray-900">{suCount}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Controls */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex gap-3">
                  <select 
                    value={filterSemester} 
                    onChange={(e) => setFilterSemester(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {getUniqueSemesters().map(sem => (
                      <option key={sem} value={sem}>{sem}</option>
                    ))}
                  </select>
                  
                  <select 
                    value={filterFocusArea} 
                    onChange={(e) => setFilterFocusArea(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {getAllFocusAreas().map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setEditingModule({})} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                    Add Module
                  </button>
                  <button onClick={exportToCSV} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                    Export
                  </button>
                  <button onClick={expandAll} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                    Expand
                  </button>
                  <button onClick={collapseAll} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                    Collapse
                  </button>
                </div>
              </div>
            </div>

            {/* Import */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Import CSV</h3>
              <label className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-200 transition-colors">
                Choose File
                <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
              </label>
              <p className="text-xs text-gray-500 mt-2">Format: Semester, Code, Name, MC, Focus Area, Workload, Grade</p>
            </div>

            {/* Modules */}
            {getFilteredModules().sortedSemesters.length === 0 ? (
              <div className="bg-white rounded-lg p-12 border border-gray-200 text-center">
                <p className="text-gray-500">No modules found. Add some to get started!</p>
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
                      <div 
                        className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
                        onClick={() => toggleSemester(semester)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 text-sm">{isExpanded ? '▼' : '▶'}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900">{semester}</h3>
                            <div className="flex gap-4 mt-1">
                              <span className="text-xs text-gray-600">{semesterMCs} MCs</span>
                              {semesterGPA !== 'N/A' && (
                                <span className="text-xs text-gray-600">GPA: {semesterGPA}</span>
                              )}
                              <span className="text-xs text-gray-600">{semesterModules.length} modules</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="px-6 pb-6 pt-2 bg-gray-50 border-t border-gray-200">
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* GPA Calculator */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
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
                <button onClick={calculateGpaSpeculation} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                  Calculate
                </button>
              </div>
              
              {gpaSpeculation && (
                <div className={`mt-4 p-4 rounded-lg text-sm ${gpaSpeculation.achievable ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className={gpaSpeculation.achievable ? 'text-green-800' : 'text-red-800'}>{gpaSpeculation.message}</p>
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

            {/* Charts */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Focus Areas</h3>
              <div className="h-64">
                {Object.keys(getFocusAreaStats()).length > 0 ? (
                  <Pie data={getFocusAreaChartData()} options={pieChartOptions} />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Workload</h3>
              <div className="h-64">
                {getWorkloadChartData().labels.length > 0 ? (
                  <Bar data={getWorkloadChartData()} options={barChartOptions} />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>
                )}
              </div>
            </div>

            <button onClick={clearAllData} className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
              Clear All Data
            </button>
          </div>
        </div>
      </div>

      <ModuleForm 
        module={editingModule}
        onSave={editingModule && editingModule.id ? updateModule : addModule}
        onCancel={() => setEditingModule(null)}
        semesterOptions={semesterOptions}
      />
    </div>
  );
};

const ModuleForm = ({ module, onSave, onCancel, semesterOptions }) => {
  const [formData, setFormData] = useState({
    year: '',
    semesterPart: 'Semester 1',
    code: '',
    name: '',
    mc: 4,
    focusArea: '',
    workload: '',
    grade: ''
  });

  useEffect(() => {
    if (module) {
      if (module.id) {
        const semesterMatch = module.semester.match(/Year (\d+) (.+)/);
        if (semesterMatch) {
          setFormData({
            ...module,
            year: semesterMatch[1],
            semesterPart: semesterMatch[2],
            focusArea: module.focusArea || ''
          });
        } else {
          setFormData({
            ...module,
            year: '',
            semesterPart: 'Semester 1',
            focusArea: module.focusArea || ''
          });
        }
      } else {
        setFormData({
          year: '',
          semesterPart: 'Semester 1',
          code: '',
          name: '',
          mc: 4,
          focusArea: '',
          workload: '',
          grade: ''
        });
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
    
    onSave({
      ...formData,
      semester: semester,
      focusArea: formData.focusArea || 'None'
    });
    
    setFormData({
      year: '',
      semesterPart: 'Semester 1',
      code: '',
      name: '',
      mc: 4,
      focusArea: '',
      workload: '',
      grade: ''
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {module.id ? 'Edit Module' : 'Add New Module'}
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
              <input
                type="number"
                min="1"
                max="6"
                placeholder="1-6"
                value={formData.year}
                onChange={(e) => setFormData({...formData, year: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
              <select
                value={formData.semesterPart}
                onChange={(e) => setFormData({...formData, semesterPart: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                {semesterOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Module Code *</label>
              <input
                type="text"
                placeholder="CS3230"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MCs *</label>
              <select
                value={formData.mc}
                onChange={(e) => setFormData({...formData, mc: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {[1,2,3,4,5,6,8,10,12].map(mc => (
                  <option key={mc} value={mc}>{mc}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Module Name *</label>
              <input
                type="text"
                placeholder="Design & Analysis of Algorithms"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Focus Area</label>
              <input
                type="text"
                placeholder="e.g., Algorithms & Theory"
                value={formData.focusArea}
                onChange={(e) => setFormData({...formData, focusArea: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Workload (hrs/week)</label>
              <input
                type="text"
                placeholder="10"
                value={formData.workload}
                onChange={(e) => setFormData({...formData, workload: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
              <select
                value={formData.grade}
                onChange={(e) => setFormData({...formData, grade: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
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
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              {module.id ? 'Update' : 'Add'} Module
            </button>
          </div>
        </form>
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
    <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-indigo-300 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-semibold text-gray-900">{module.code}</div>
          <div className="text-sm text-gray-600">{module.name}</div>
        </div>
        <div className="flex items-center gap-2">
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
        <div>{module.focusArea}</div>
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