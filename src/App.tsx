import React, { useState, useRef, useEffect } from 'react';
import { Upload, Users, RotateCcw, FileText, Settings } from 'lucide-react';
import Papa from 'papaparse';
import './App.css'; // Import our CSS file
import './index.css'; // Keep this for base styles

const CareCallManager = () => {
  const [rosterData, setRosterData] = useState([]);
  const [staffList, setStaffList] = useState(['Sara', 'Melissa', 'Sky', 'TK', 'Becci', 'Allison', 'Eliza']);
  const [selectedMonth, setSelectedMonth] = useState('January');
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const [assignments, setAssignments] = useState([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [printedList, setPrintedList] = useState('');
  const [isProcessed, setIsProcessed] = useState(false);
  const fileInputRef = useRef(null);

  // All your JavaScript functions (getFieldValue, handleFileUpload, etc.) remain the same.
  // Make sure they are all here in your actual file.

  const getFieldValue = (agent, fieldOptions) => {
    for (const field of fieldOptions) {
      if (agent[field] && agent[field].toString().trim() !== '') return agent[field];
    }
    const agentKeys = Object.keys(agent);
    for (const field of fieldOptions) {
      const matchingKey = agentKeys.find(key => key.toLowerCase().includes(field.toLowerCase()));
      if (matchingKey && agent[matchingKey] && agent[matchingKey].toString().trim() !== '') return agent[matchingKey];
    }
    return 'N/A';
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('Please select a CSV file (.csv extension required)');
        return;
      }
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const cleanData = results.data.filter(row => Object.values(row).some(val => val && val.toString().trim() !== ''));
          if (cleanData.length === 0) {
            alert('No valid data found in CSV.');
            return;
          }
          setRosterData(cleanData);
          setIsProcessed(false);
          alert(`Successfully loaded ${cleanData.length} records.`);
        },
        error: (error) => alert('Error parsing CSV file: ' + error.message),
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
    setStaffList(staffList.filter((_, i) => i !== index));
    setIsProcessed(false);
  };

  const processAssignments = () => {
    if (rosterData.length === 0 || staffList.length === 0) {
      alert('Please upload roster data and add staff members.');
      return;
    }
    let currentAssignments = {};
    staffList.forEach(staff => currentAssignments[staff] = []);
    rosterData.forEach((agent, index) => {
      const staffMember = staffList[index % staffList.length];
      currentAssignments[staffMember].push(agent);
    });
    setAssignments(currentAssignments);
    setIsProcessed(true);
    setPrintedList('');
  };

  const getStaffCounts = () => {
    const counts = {};
    Object.entries(assignments).forEach(([staff, agents]) => {
      counts[staff] = agents.length;
    });
    return counts;
  };

  const printList = () => {
    let output = '';
    Object.entries(assignments).forEach(([staff, agents]) => {
      agents.forEach(agent => {
        let name = getFieldValue(agent, ['Full Name', 'Name']);
        if (name.includes(',')) {
          const parts = name.split(',').map(part => part.trim());
          name = `${parts[1]} ${parts[0]}`;
        }
        const phone = getFieldValue(agent, ['Phone', 'Mobile']);
        const email = getFieldValue(agent, ['Email']);
        output += `${staff}, ${name}, ${phone}, ${email}\n`;
      });
    });
    setPrintedList(output);
  };

  return (
    <div className="app-container">
      <div className="card">
        <div className="card-header">
          <Users size={28} color="#2563eb" />
          <h1 className="card-title">Care Call Assignment Manager</h1>
        </div>

        <div className="setup-grid">
          <div className="upload-box">
            <Upload size={48} color="#9ca3af" />
            <h3>Upload Roster CSV</h3>
            <p>Upload your monthly agent roster file</p>
            <input type="file" accept=".csv" onChange={handleFileUpload} ref={fileInputRef} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary">
              Choose File
            </button>
            {rosterData.length > 0 && <p style={{ color: 'green', fontWeight: '600', marginTop: '1rem' }}>✓ {rosterData.length} agents loaded</p>}
          </div>

          <div className="staff-box">
            <div className="staff-header"> <Settings size={20} /> <h3>Staff Management</h3> </div>
            <div className="add-staff-form">
              <input type="text" value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} placeholder="Add staff member" className="text-input" />
              <button onClick={addStaffMember} className="btn btn-success">Add</button>
            </div>
            <div className="staff-list">
              {staffList.map((staff, index) => (
                <div key={index} className="staff-item">
                  <span>{staff}</span>
                  <button onClick={() => removeStaffMember(index)} className="remove-btn">Remove</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="controls">
          <RotateCcw size={20} /> <label>Month:</label>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            {months.map(month => <option key={month} value={month}>{month}</option>)}
          </select>
          <button onClick={processAssignments} disabled={rosterData.length === 0 || staffList.length === 0} className="btn btn-secondary">
            <FileText size={20} /> {isProcessed ? ' Reprocess Assignments' : ' Process Assignments'}
          </button>
        </div>

        {/* --- THIS IS THE RESTORED SECTION --- */}
        {isProcessed && (
          <div className="distribution-card">
            <h3>Assignment Distribution</h3>
            <div className="distribution-grid">
              {Object.entries(getStaffCounts()).map(([staff, count]) => (
                <div key={staff} className="distribution-item">
                  <div className="staff-name">{staff}</div>
                  <div className="staff-count">{count}</div>
                </div>
              ))}
            </div>

            <div className="print-list-container">
              <button onClick={printList} className="btn btn-success">
                <FileText size={20} /> Generate Print List
              </button>
            </div>

            {printedList && (
              <div className="print-list-output">
                <div className="print-list-header">
                  <h3>Comma-Separated List</h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(printedList);
                      alert('List copied to clipboard!');
                    }}
                    className="btn btn-primary"
                  >
                    Copy
                  </button>
                </div>
                <pre className="print-list-pre">{printedList}</pre>
              </div>
            )}
          </div>
        )}
        {/* --- END OF RESTORED SECTION --- */}

        {/* Assignment Results Table (Optional to show) */}
        {isProcessed && Object.keys(assignments).length > 0 && (
          <div className="card">
             <h2>Detailed Assignments</h2>
             {Object.entries(assignments).filter(([, agents]) => agents.length > 0).map(([staff, agents]) => (
              <div key={staff} style={{marginTop: '1rem'}}>
                <h3>{staff} ({agents.length} agents)</h3>
                <table className="results-table">
                  <thead>
                    <tr><th>Name</th><th>Phone</th><th>Email</th></tr>
                  </thead>
                  <tbody>
                    {agents.map((agent, index) => (
                      <tr key={index}>
                        <td>{getFieldValue(agent, ['Full Name', 'Name'])}</td>
                        <td>{getFieldValue(agent, ['Phone', 'Mobile'])}</td>
                        <td>{getFieldValue(agent, ['Email'])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default CareCallManager;