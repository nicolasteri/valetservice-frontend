import React, { useState } from 'react';
import * as XLSX from 'xlsx';

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function ShiftTracker() {
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [weeklyData, setWeeklyData] = useState({
    "Monday": [],
    "Tuesday": [],
    "Wednesday": [],
    "Thursday": [],
    "Friday": [],
    "Saturday": [],
    "Sunday": []
  });
  const [carsPerDay, setCarsPerDay] = useState({});
  const [companyFee, setCompanyFee] = useState(0);

  const addShift = () => {
    const name = prompt("Employee Name:");
    const clockIn = prompt("Clock In (HH:MM):");
    const clockOut = prompt("Clock Out (HH:MM):");

    const [inHours, inMinutes] = clockIn.split(':').map(Number);
    const [outHours, outMinutes] = clockOut.split(':').map(Number);

    const hoursWorked = ((outHours * 60 + outMinutes) - (inHours * 60 + inMinutes)) / 60;

    const newShift = {
      id: weeklyData[selectedDay].length + 1,
      name,
      clockIn,
      clockOut,
      hours: hoursWorked.toFixed(2)
    };

    setWeeklyData(prev => ({
      ...prev,
      [selectedDay]: [...prev[selectedDay], newShift]
    }));
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    days.forEach(day => {
      const wsData = [
        ["ID", "Name", "Clock In", "Clock Out", "Hours"],
        ...weeklyData[day].map(shift => [shift.id, shift.name, shift.clockIn, shift.clockOut, shift.hours]),
        [],
        ["Cars", carsPerDay[day] || 0],
        ["Company Fee", companyFee],
        ["Tot Fee", (carsPerDay[day] || 0) * companyFee]
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, day);
    });

    XLSX.writeFile(wb, 'shifts_week.xlsx');
  };

  const totalHours = weeklyData[selectedDay].reduce((sum, shift) => sum + parseFloat(shift.hours), 0);
  const dailyCars = carsPerDay[selectedDay] || 0;
  const totalDayFee = dailyCars * companyFee;

  return (
    <div>
      <h1>Shift Tracker</h1>
      <div>
        {days.map(day => (
          <button key={day} onClick={() => setSelectedDay(day)} style={{ margin: '5px' }}>
            {day}
          </button>
        ))}
      </div>

      <h2>{selectedDay}</h2>
      <button onClick={addShift}>Add Shift</button>
      <table border="1" style={{ marginTop: '10px' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Clock In</th>
            <th>Clock Out</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody>
          {weeklyData[selectedDay].map(shift => (
            <tr key={shift.id}>
              <td>{shift.id}</td>
              <td>{shift.name}</td>
              <td>{shift.clockIn}</td>
              <td>{shift.clockOut}</td>
              <td>{shift.hours}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '10px' }}>
        <p>Total Hours: {totalHours.toFixed(2)}</p>
        <p>
          Cars: 
          <input 
            type="number" 
            value={dailyCars} 
            onChange={(e) => setCarsPerDay(prev => ({ ...prev, [selectedDay]: parseInt(e.target.value) || 0 }))} 
          />
        </p>
        <p>
          Company Fee ($): 
          <input 
            type="number" 
            value={companyFee} 
            onChange={(e) => setCompanyFee(parseFloat(e.target.value) || 0)} 
          />
        </p>
        <p><strong>Tot Fee ($): {totalDayFee.toFixed(2)}</strong></p>
      </div>

      <button onClick={exportToExcel}>Export Week to Excel</button>
    </div>
  );
}

export default ShiftTracker;
