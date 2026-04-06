# Analytics Integration for MERN Stack

Here is the additional code you requested to bridge the existing "Orders" data to the new "Analytics" view using MongoDB aggregation and React.

> **Note**: I noticed your current `Truffles_Menu_Updates` workspace uses vanilla JS and a JSON-file-based backend instead of MongoDB/React. If you plan to migrate to a MERN stack or deploy this in your actual React/Mongo repository, you can simply drop these files in.

## 1. Backend: Analytics Controller
Create a new file `backend/controllers/analyticsController.js`. It uses MongoDB aggregation framework to fetch today\'s total sales vs the selected date, top-selling dishes, and peak traffic hours relying on the `createdAt` timestamp.

```javascript
const Order = require('../models/Order'); // Adjust exactly to your Order model path

const getAnalytics = async (req, res) => {
  try {
    // Determine the selected date (default to today if none provided)
    const queryDate = req.query.date ? new Date(req.query.date) : new Date();
    
    // Start and end parameters for the selected date
    const selectedDateStart = new Date(queryDate);
    selectedDateStart.setHours(0, 0, 0, 0);
    const selectedDateEnd = new Date(queryDate);
    selectedDateEnd.setHours(23, 59, 59, 999);

    // Start and end parameters for today
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // 1. Total Sales: Today vs Selected Date
    const salesAggregation = await Order.aggregate([
      {
        $facet: {
          todaySales: [
            { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
            // Using "total" or "price", adjust to match your Order schema
            { $group: { _id: null, total: { $sum: "$total" } } } 
          ],
          selectedDateSales: [
            { $match: { createdAt: { $gte: selectedDateStart, $lte: selectedDateEnd } } },
            { $group: { _id: null, total: { $sum: "$total" } } }
          ]
        }
      }
    ]);

    const todayTotal = salesAggregation[0].todaySales[0]?.total || 0;
    const selectedTotal = salesAggregation[0].selectedDateSales[0]?.total || 0;

    // 2. Top Selling Dishes (for the selected date)
    const topDishes = await Order.aggregate([
      { $match: { createdAt: { $gte: selectedDateStart, $lte: selectedDateEnd } } },
      { $unwind: "$items" },
      { $group: { 
          _id: "$items.name", // Adjust to your item name field format (e.g., "$items.dishName")
          count: { $sum: "$items.quantity" } 
      }},
      { $sort: { count: -1 } },
      { $limit: 5 } // Pick top 5
    ]);

    // 3. Peak Traffic Hours (for the selected date)
    const peakHours = await Order.aggregate([
      { $match: { createdAt: { $gte: selectedDateStart, $lte: selectedDateEnd } } },
      { 
        $project: {
          // Adjust timezone if your server expects a specific local time
          hour: { $hour: { date: "$createdAt" } } 
        }
      },
      { $group: {
          _id: "$hour",
          orderCount: { $sum: 1 }
      }},
      { $sort: { _id: 1 } } // Sort by hour of the day (0-23)
    ]);

    // Format peak hours for frontend UI (e.g., "14:00")
    const formattedPeakHours = peakHours.map(ph => ({
      hour: `${String(ph._id).padStart(2, '0')}:00`,
      orders: ph.orderCount
    }));

    res.json({
      sales: {
        today: todayTotal,
        selectedDate: selectedTotal
      },
      topDishes: topDishes.map(d => ({ name: d._id, count: d.count })),
      peakHours: formattedPeakHours
    });

  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ message: "Server error fetching analytics" });
  }
};

module.exports = { getAnalytics };
```

## 2. Backend: Analytics Route
Create a new file `backend/routes/analyticsRoutes.js`.

```javascript
const express = require('express');
const router = express.Router();
const { getAnalytics } = require('../controllers/analyticsController');

// Ensure you apply your admin authorization middleware here
// e.g., router.get('/', authenticateAdmin, getAnalytics);
router.get('/', getAnalytics);

module.exports = router;
```

*Don\'t forget to mount it in your **`server.js`** file:*
```javascript
const analyticsRoutes = require('./routes/analyticsRoutes');
app.use('/api/analytics', analyticsRoutes);
```

## 3. Frontend: React Analytics Component
Install `recharts` in your frontend if you haven\'t already: `npm install recharts`

Create the new file `frontend/src/components/Analytics.js` (or adjust path as necessary):

```jsx
import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  LineChart, Line 
} from 'recharts';
import './Analytics.css'; // Add your styling

const Analytics = () => {
  // Default to today's date in YYYY-MM-DD format
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics(selectedDate);
  }, [selectedDate]);

  const fetchAnalytics = async (date) => {
    setLoading(true);
    try {
      // Pass the selected date as a query parameter
      const response = await fetch(`/api/analytics?date=${date}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}` // Insert your auth strategy here
        }
      });
      
      if (!response.ok) throw new Error("Failed to fetch analytics");
      
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  if (loading && !analyticsData) return <div className="loading">Loading Analytics...</div>;
  if (!analyticsData) return <div className="error">Failed to load data</div>;

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <h2>Analytics Dashboard</h2>
        <div className="date-picker-container">
          <label htmlFor="analytics-date">Select Date: </label>
          <input 
            type="date" 
            id="analytics-date" 
            value={selectedDate} 
            onChange={handleDateChange} 
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      <div className="stats-cards">
        <div className="card">
          <h3>Total Sales (Selected Date)</h3>
          <p className="value">${analyticsData.sales.selectedDate.toFixed(2)}</p>
        </div>
        <div className="card">
          <h3>Total Sales (Today)</h3>
          <p className="value">${analyticsData.sales.today.toFixed(2)}</p>
        </div>
      </div>

      <div className="charts-container">
        {/* Top Selling Dishes - Bar Chart */}
        <div className="chart-box">
          <h3>Top Selling Dishes</h3>
          {analyticsData.topDishes.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.topDishes} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#4CAF50" name="Items Sold" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">No sales data for this date.</p>
          )}
        </div>

        {/* Peak Traffic Hours - Line Chart */}
        <div className="chart-box">
          <h3>Peak Traffic Hours</h3>
          {analyticsData.peakHours.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.peakHours} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke="#2196F3" strokeWidth={3} name="Total Orders" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">No traffic data for this date.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
```
