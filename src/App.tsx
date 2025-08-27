import React, { useState, useRef } from 'react';
import { Upload, Download, Users, RotateCcw, FileText, Settings } from 'lucide-react';
import Papa from 'papaparse';
import './index.css';

const CareCallManager = () => {
  const [rosterData, setRosterData] = useState([]);
  const [staffList, setStaffList] = useState(['Sara', 'Melissa', 'Sky', 'TK', 'Becci', 'Allison', 'Eliza']);
  const [selectedMonth, setSelectedMonth] = useState('January');
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const [assignments, setAssignments] = useState([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [printedList, setPrintedList] = useState('');
  const [isProcessed, setIsProcessed] = useState(false);
  const [swapDropdowns, setSwapDropdowns] = useState({});
  const fileInputRef = useRef(null);

  // Helper function to get field value with fallback options - case insensitive
  const getFieldValue = (agent, fieldOptions) => {
    // First try exact matches
    for (const field of fieldOptions) {
      if (agent[field] && agent[field].toString().trim() !== '') {
        return agent[field];
      }
    }
    
    // Then try case-insensitive and partial matches
    const agentKeys = Object.keys(agent);
    for (const field of fieldOptions) {
      const matchingKey = agentKeys.find(key => {
        const keyLower = key.toLowerCase();
        const fieldLower = field.toLowerCase();
        return keyLower.includes(fieldLower) || 
               fieldLower.includes(keyLower) ||
               keyLower === fieldLower;
      });
      if (matchingKey && agent[matchingKey] && agent[matchingKey].toString().trim() !== '') {
        return agent[matchingKey];
      }
    }
    
    return 'N/A';
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check if it's a CSV file
      if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('Please select a CSV file (.csv extension required)');
        return;
      }

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        encoding: 'UTF-8',
        complete: (results) => {
          console.log('Parsed CSV results:', results);
          
          if (results.errors && results.errors.length > 0) {
            console.warn('CSV parsing warnings:', results.errors);
          }

          // More flexible filtering - check for any non-empty field that might indicate a valid row
          const cleanData = results.data.filter(row => {
            // Check if row has any meaningful data
            const hasData = Object.values(row).some(value => 
              value && typeof value === 'string' && value.trim() !== ''
            );
            
            if (!hasData) return false;
            
            // Filter out specific staff members and coaches
            const name = getFieldValue(row, ['Full Name', 'Name', 'Employee Name', 'full name', 'name']);
            if (name && typeof name === 'string') {
              const nameLower = name.toLowerCase();
              
              // Filter out specific individuals
              const excludeNames = [
                'adam whitt',
                'leah rice', 
                'melissa espinoza',
                'pro coach b',
                'coach b'
              ];
              
              const shouldExclude = excludeNames.some(excludeName => 
                nameLower.includes(excludeName) || excludeName.includes(nameLower)
              );
              
              if (shouldExclude) {
                return false;
              }
            }
            
            return true;
          });

          console.log('Cleaned data:', cleanData);
          
          if (cleanData.length === 0) {
            alert('No valid data found in CSV. Please check your file format.');
            return;
          }

          setRosterData(cleanData);
          setIsProcessed(false);
          alert(`Successfully loaded ${cleanData.length} records from CSV file.`);
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          alert('Error parsing CSV file: ' + error.message);
        }
      });
    }
  };

  const addStaffMember = () => {
    if (newStaffName.trim() && !staffList.includes(newStaffName.trim())) {
      setStaffList([...staffList, newStaffName.trim()]);
      setNewStaffName('');
      setIsProcessed(false);
    }
  };

  const removeStaffMember = (index) => {
    const newList = staffList.filter((_, i) => i !== index);
    setStaffList(newList);
    setIsProcessed(false);
  };

  const processAssignments = () => {
    if (rosterData.length === 0 || staffList.length === 0) {
      alert('Please upload roster data and ensure you have staff members configured.');
      return;
    }

    console.log('Processing assignments with roster data:', rosterData);
    console.log('Sample row:', rosterData[0]);

    const assignmentsByStaff = {};
    staffList.forEach(staff => {
      assignmentsByStaff[staff] = [];
    });

    // Get month index (0-11)
    const monthIndex = months.indexOf(selectedMonth);
    
    // Create a shuffled copy of roster data for more random distribution
    const shuffledRoster = [...rosterData];
    
    // Use month as seed for consistent but different shuffling each month
    // This ensures the same month always produces the same arrangement
    const seed = monthIndex + 1;
    for (let i = shuffledRoster.length - 1; i > 0; i--) {
      // Use month-based pseudo-random for consistent results
      const j = ((seed * 9301 + 49297) % 233280) % (i + 1);
      [shuffledRoster[i], shuffledRoster[j]] = [shuffledRoster[j], shuffledRoster[i]];
    }

    // Calculate base assignments per staff member
    const baseAssignments = Math.floor(shuffledRoster.length / staffList.length);
    const extraAssignments = shuffledRoster.length % staffList.length;

    // Create a shuffled staff list for random distribution of extras
    const shuffledStaff = [...staffList];
    for (let i = shuffledStaff.length - 1; i > 0; i--) {
      const j = ((seed * 7919 + 31847) % 233280) % (i + 1);
      [shuffledStaff[i], shuffledStaff[j]] = [shuffledStaff[j], shuffledStaff[i]];
    }

    let agentIndex = 0;
    
    // Assign agents to staff members
    shuffledStaff.forEach((staff, staffIndex) => {
      // Determine how many agents this staff member gets
      const assignmentsForThisStaff = baseAssignments + (staffIndex < extraAssignments ? 1 : 0);
      
      // Assign the calculated number of agents
      for (let i = 0; i < assignmentsForThisStaff && agentIndex < shuffledRoster.length; i++) {
        const agent = shuffledRoster[agentIndex];
        assignmentsByStaff[staff].push({
          ...agent,
          'Staff Member Assigned': staff,
          'Called': 'FALSE',
          'Logged in CM': 'FALSE'
        });
        agentIndex++;
      }
    });

    // Sort each staff member's agents alphabetically by name
    Object.keys(assignmentsByStaff).forEach(staff => {
      assignmentsByStaff[staff].sort((a, b) => {
        const nameA = getFieldValue(a, ['Full Name', 'Name', 'Employee Name', 'full name', 'name']);
        const nameB = getFieldValue(b, ['Full Name', 'Name', 'Employee Name', 'full name', 'name']);
        return nameA.localeCompare(nameB);
      });
    });

    console.log('Assignments created:', assignmentsByStaff);
    setAssignments(assignmentsByStaff);
    setIsProcessed(true);
    setPrintedList(''); // Clear previous print list
    setSwapDropdowns({});
  };

  const printList = () => {
    if (!isProcessed || Object.keys(assignments).length === 0) {
      alert('Please process assignments first.');
      return;
    }

    let output = '';
    Object.entries(assignments)
      .filter(([staff, agents]) => agents.length > 0)
      .forEach(([staff, agents]) => {
        agents.forEach(agent => {
          let name = getFieldValue(agent, ['Full Name', 'Name', 'Employee Name', 'full name', 'name']);
          
          // Flip "Last, First" to "First Last"
          if (name.includes(',')) {
            const nameParts = name.split(',').map(part => part.trim());
            if (nameParts.length >= 2) {
              name = `${nameParts[1]} ${nameParts[0]}`;
            }
          }
          
          const phone = getFieldValue(agent, ['Phone', 'Assoc Phone', 'Phone Number', 'Mobile', 'phone', 'mobile']);
          const email = getFieldValue(agent, ['Email', 'Assoc Email', 'Email Address', 'email']);
          const birthday = getFieldValue(agent, ['Birthday', 'Bday', 'Birth Date', 'DOB', 'birthday', 'bday']);
          const startDate = getFieldValue(agent, ['MC Start Date', 'Start Date', 'Hire Date', 'Date Hired', 'start date', 'hire date']);
          const anniversary = getFieldValue(agent, ['Anniversary', 'Anniversary Date', 'Work Anniversary', 'Service Anniversary', 'Hire Anniversary', 'Employment Anniversary', 'Tenure Anniversary', 'MC Anniversary', 'anniversary', 'work anniversary', 'service anniversary', 'hire anniversary', 'employment anniversary', 'mc anniversary', 'Anniv', 'anniv']);
          
          // Only include anniversary if it's not N/A
          const anniversaryPart = anniversary !== 'N/A' ? `, ${anniversary}` : '';
          
          output += `${staff}, ${name}, ${phone}, ${email}, ${birthday}, ${startDate}${anniversaryPart}\n`;
        });
      });

    setPrintedList(output);
  };

  const getStaffCounts = () => {
    if (!isProcessed) return {};
    const counts = {};
    Object.entries(assignments).forEach(([staff, agents]) => {
      counts[staff] = agents.length;
    });
    return counts;
  };

  const toggleSwapDropdown = (agentKey) => {
    setSwapDropdowns(prev => ({
      ...prev,
      [agentKey]: !prev[agentKey]
    }));
  };

  const swapAgents = (sourceStaff, sourceAgent, targetStaff) => {
    if (sourceStaff === targetStaff) {
      return;
    }

    const newAssignments = { ...assignments };

    // Remove agent from source staff
    newAssignments[sourceStaff] = newAssignments[sourceStaff].filter(agent => agent !== sourceAgent);

    // Get the name of the agent we're moving
    const sourceAgentName = getFieldValue(sourceAgent, ['Full Name', 'Name', 'Employee Name', 'full name', 'name']);

    // Find the closest alphabetically following agent from target staff to swap
    const targetAgents = [...newAssignments[targetStaff]];
    targetAgents.sort((a, b) => {
      const nameA = getFieldValue(a, ['Full Name', 'Name', 'Employee Name', 'full name', 'name']);
      const nameB = getFieldValue(b, ['Full Name', 'Name', 'Employee Name', 'full name', 'name']);
      return nameA.localeCompare(nameB);
    });

    let agentToSwap = null;
    
    // Find the first agent alphabetically after where our source agent would be inserted
    for (let i = 0; i < targetAgents.length; i++) {
      const targetAgentName = getFieldValue(targetAgents[i], ['Full Name', 'Name', 'Employee Name', 'full name', 'name']);
      if (targetAgentName.localeCompare(sourceAgentName) > 0) {
        agentToSwap = targetAgents[i];
        break;
      }
    }

    // If no agent found after, take the last one
    if (!agentToSwap && targetAgents.length > 0) {
      agentToSwap = targetAgents[targetAgents.length - 1];
    }

    // Update staff assignments for both agents
    sourceAgent['Staff Member Assigned'] = targetStaff;
    if (agentToSwap) {
      agentToSwap['Staff Member Assigned'] = sourceStaff;
      // Remove the agent to swap from target staff
      newAssignments[targetStaff] = newAssignments[targetStaff].filter(agent => agent !== agentToSwap);
      // Add it to source staff
      newAssignments[sourceStaff].push(agentToSwap);
    }

    // Add source agent to target staff
    newAssignments[targetStaff].push(sourceAgent);

    // Sort both staff lists alphabetically
    [sourceStaff, targetStaff].forEach(staff => {
      newAssignments[staff].sort((a, b) => {
        const nameA = getFieldValue(a, ['Full Name', 'Name', 'Employee Name', 'full name', 'name']);
        const nameB = getFieldValue(b, ['Full Name', 'Name', 'Employee Name', 'full name', 'name']);
        return nameA.localeCompare(nameB);
      });
    });

    setAssignments(newAssignments);
    setSwapDropdowns({});
  };

  // Close dropdowns when clicking outside
  const handleDocumentClick = (event) => {
    if (!event.target.closest('.dropdown-container')) {
      setSwapDropdowns({});
    }
  };

  React.useEffect(() => {
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="text-blue-600" size={28} />
          <h1 className="text-2xl font-bold text-gray-800">Care Call Assignment Manager</h1>
        </div>

        {/* Upload Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              <Upload className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold mb-2">Upload Roster CSV</h3>
              <p className="text-gray-600 mb-4">Upload your monthly agent roster file</p>
              <input
                type="file"
                accept=".csv,text/csv,application/csv"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="hidden"
                multiple={false}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Choose File
              </button>
              {rosterData.length > 0 && (
                <div className="mt-2">
                  <p className="text-green-600 font-semibold">
                    ✓ {rosterData.length} agents loaded
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Columns found: {Object.keys(rosterData[0] || {}).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Staff Management */}
          <div className="border border-gray-300 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="text-gray-600" size={20} />
              <h3 className="text-lg font-semibold">Staff Management</h3>
            </div>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="Add staff member"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addStaffMember}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Add
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {staffList.map((staff, index) => (
                <div key={index} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded">
                  <span className="font-medium">{staff}</span>
                  <button
                    onClick={() => removeStaffMember(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-center mb-6">
          <div className="flex items-center gap-2">
            <RotateCcw className="text-gray-600" size={20} />
            <label className="font-semibold">Month:</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setIsProcessed(false);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {months.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>

          <button
            onClick={processAssignments}
            disabled={rosterData.length === 0 || staffList.length === 0}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <FileText size={20} />
            {isProcessed ? 'Reprocess Assignments' : 'Process Assignments'}
          </button>
        </div>

        {/* Staff Count Summary */}
        {isProcessed && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">Assignment Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(getStaffCounts()).map(([staff, count]) => (
                <div key={staff} className="bg-white rounded p-3 text-center">
                  <div className="font-semibold text-gray-800">{staff}</div>
                  <div className="text-2xl font-bold text-blue-600">{count}</div>
                </div>
              ))}
            </div>
            
            {/* Print List Button */}
            <div className="mt-4 text-center">
              <button
                onClick={printList}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto"
              >
                <FileText size={20} />
                Generate Print List
              </button>
            </div>

            {/* Print List Section - moved here */}
            {printedList && (
              <div className="mt-6 space-y-4">
                <div className="border border-gray-300 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">Comma-Separated List</h3>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(printedList);
                        alert('List copied to clipboard!');
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm"
                    >
                      Copy to Clipboard
                    </button>
                  </div>
                  <div className="bg-gray-50 p-4 rounded border">
                    <pre className="text-sm whitespace-pre-wrap font-mono text-gray-800">
                      {printedList}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Assignment Results */}
        {isProcessed && Object.keys(assignments).length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Assignment Results</h2>
            
            {Object.entries(assignments)
              .filter(([staff, agents]) => agents.length > 0)
              .map(([staff, agents]) => (
              <div key={staff} className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-3 border-b">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {staff} ({agents.length} agents)
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  {agents.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Name</th>
                          <th className="px-4 py-2 text-left">Phone</th>
                          <th className="px-4 py-2 text-left">Email</th>
                          <th className="px-4 py-2 text-left">Birthday</th>
                          <th className="px-4 py-2 text-left">MC Start Date</th>
                          <th className="px-4 py-2 text-left">Anniversary</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agents.map((agent, index) => {
                          const agentKey = `${staff}-${index}`;
                          const agentName = getFieldValue(agent, ['Full Name', 'Name', 'Employee Name', 'full name', 'name']);
                          return (
                            <tr key={index} className="border-t hover:bg-gray-50">
                              <td className="px-4 py-2 font-medium relative">
                                <div className="dropdown-container relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSwapDropdown(agentKey);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left flex items-center gap-1"
                                  >
                                    {agentName}
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                  
                                  {swapDropdowns[agentKey] && (
                                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-40">
                                      <div className="p-2">
                                        <div className="text-xs font-semibold text-gray-600 mb-2">Switch to:</div>
                                        {staffList
                                          .filter(targetStaff => targetStaff !== staff)
                                          .map(targetStaff => (
                                          <button
                                            key={targetStaff}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              swapAgents(staff, agent, targetStaff);
                                            }}
                                            className="block w-full text-left px-2 py-1 text-sm hover:bg-blue-50 hover:text-blue-700 rounded transition-colors"
                                          >
                                            {targetStaff}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                {getFieldValue(agent, ['Phone', 'Assoc Phone', 'Phone Number', 'Mobile', 'phone', 'mobile'])}
                              </td>
                              <td className="px-4 py-2">
                                {getFieldValue(agent, ['Email', 'Assoc Email', 'Email Address', 'email'])}
                              </td>
                              <td className="px-4 py-2">
                                {getFieldValue(agent, ['Birthday', 'Bday', 'Birth Date', 'DOB', 'birthday', 'bday'])}
                              </td>
                              <td className="px-4 py-2">
                                {getFieldValue(agent, ['MC Start Date', 'Start Date', 'Hire Date', 'Date Hired', 'start date', 'hire date'])}
                              </td>
                              <td className="px-4 py-2">
                                {getFieldValue(agent, ['Anniversary', 'Anniversary Date', 'Work Anniversary', 'Service Anniversary', 'Hire Anniversary', 'Employment Anniversary', 'Tenure Anniversary', 'MC Anniversary', 'anniversary', 'work anniversary', 'service anniversary', 'hire anniversary', 'employment anniversary', 'mc anniversary', 'Anniv', 'anniv'])}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No agents assigned to {staff}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CareCallManager;