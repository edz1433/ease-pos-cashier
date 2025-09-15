import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "admin-lte/dist/css/adminlte.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./styles/cashier.css";
import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import Menu from "./pages/Menu";
import Orders from "./pages/Orders";
import MenuEdit from "./pages/MenuEdit";
import AuthCheck from "./components/AuthCheck"; // Import the AuthCheck component
import { Navigate } from "react-router-dom";
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
// Main App Component that will receive user data from AuthCheck
const MainApp = ({ user, onLogout }) => {
  const inspirationalQuotes = [
    "You're not just selling a product; you're enabling innovation.",
    "Your expertise helps build the infrastructure of tomorrow.",
    "Every cable, every device, every license you sell connects someone to their future.",
    "The right technology solution can transform a business. You provide that key.",
    "You solve today's IT challenges and anticipate tomorrow's needs.",
    "Trust is the most valuable item in your inventory. Build it with every client.",
    "Stay sharp on the latest tech; your knowledge is your greatest asset.",
    "Behind every successful business is reliable IT—and you provide it.",
    "Your recommendations keep companies secure, connected, and competitive.",
    "Patience and deep product knowledge turn a prospect into a partner.",
    "Every customer interaction is a chance to solve a critical problem.",
    "Great service is remembered long after the price is forgotten.",
    "You are a vital link in the technology supply chain.",
    "A reliable product and a trustworthy recommendation go a long way.",
    "Your energy and confidence build client confidence in our solutions.",
    "Even the most complex orders end with a satisfied customer.",
    "Take pride in your product knowledge—it's what sets you apart.",
    "Your dedication keeps our clients' operations running smoothly.",
    "A little extra effort to find the right solution makes a big difference.",
    "Celebrate the small wins—every successful deployment starts with a sale.",
    "Stay proactive, be consultative, provide value.",
    "You've got this! Now go enable some innovation.",
    "Be the reason a business runs smoother today.",
    "Don't just take an order; provide a solution.",
    "Growth and success lie just outside your comfort zone.",
    "Focus on the client's problem, and the sale will follow.",
    "Start with the customer's need. Use your expertise. Provide the solution.",
    "The secret to a great sale is understanding the 'why' behind the 'what'.",
    // "Serve with a smile every plate is a chance to brighten someone's day.",
    // "Teamwork in the kitchen makes the dream work on the floor.",
    // "A happy guest starts with a happy server.",
    // "Every meal you serve is a memory for someone make it special.",
    // "Your attention to detail turns a meal into an experience.",
    // "Kindness is the secret ingredient in every dish.",
    // "Stay sharp, stay positive, and let your passion show.",
    // "Behind every great restaurant is a team that cares.",
    // "Your hard work brings people together one table at a time.",
    // "Patience and a positive attitude are always on the menu.",
    // "Every shift is a new opportunity to make someone's day.",
    // "Great service is remembered long after the meal is over.",
    // "You are the heart of the restaurant keep beating strong.",
    // "A clean table and a warm greeting go a long way.",
    // "Your energy sets the tone for the whole dining room.",
    // "Even the busiest nights end with satisfied smiles.",
    // "Take pride in your craft every detail matters.",
    // "Your dedication keeps the kitchen running and the guests returning.",
    // "A little extra effort makes a big difference.",
    // "Celebrate the small wins every happy guest counts.",
    // "Stay humble, work hard, be kind.",
    // "You've got this!",
    // "Be the reason someone smiles today.",
    // "Push yourself, because no one else is going to do it for you.",
    // "Great things never come from comfort zones.",
    // "Don't watch the clock; do what it does. Keep going.",
    // "Focus on the good.",
    // "Start where you are. Use what you have. Do what you can.",
    // "The secret of getting ahead is getting started.",
  ];

  const date = new Date();
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const index = ((day * month) + day + month) % inspirationalQuotes.length;
  const todayQuote = inspirationalQuotes[index];

  // Get user's display name
  const getDisplayName = () => {
    if (user) {
      if (user.name) return user.name;
      if (user.fname) return user.fname;
      if (user.username) return user.username;
    }
    return 'User';
  };

  return (
    <div className="d-flex">
      {/* Sidebar */}
      <aside className="custom-sidebar">
        <div className="custom-sidebar-logo">
          <img src={process.env.PUBLIC_URL + "/assets/img/logo.png"} alt="logo" className="logo-img" />
        </div>
        <ul className="custom-sidebar-menu">
          <li>
            <NavLink to="/pos" className={({ isActive }) => `custom-sidebar-link ${isActive ? "active" : ""}`}>
              <span className="icon"><i className="fa fa-th-large"></i></span>
              Menu
            </NavLink>
          </li>
          <li>
            <NavLink to="/orders" className={({ isActive }) => `custom-sidebar-link ${isActive ? "active" : ""}`}>
              <span className="icon"><i className="fa fa-list-alt"></i></span>
              Order List
            </NavLink>
          </li>
        </ul>

        <div className="logout-container">
          <a href={`${API_BASE_URL}/logout`} className="custom-sidebar-link w-100">
            <span className="icon">
              <i className="fas fa-sign-out-alt"></i>
            </span>
            Log Out
          </a>
        </div>
      </aside>
    
      {/* Main Content */}
      <div className="content-wrapper-cashier flex-grow-1">
        {/* Header */}
        <div className="content-header bg-white rounded shadow-sm d-flex justify-content-between align-items-center px-4 py-2 mb-3 header-adjust">
          <div className="d-flex align-items-center">
            <span className="user-icon">
              {user?.profile ? (
                <img
                  src={user.profile} // base64 from API
                  alt={getDisplayName()}
                  className="rounded-circle"
                  style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                />
              ) : (
                <i className="fas fa-user fa-lg text-secondary"></i>
              )}
            </span>
            <div className="text-start">
              <span className="fw-semibold text-dark pl-1">
                Welcome, {getDisplayName()}! 
                {user && user.role == 1 && (
                  <span className="badge bg-primary ms-2">Admin</span>
                )}
                {user && user.role == 2 && (
                  <span className="badge bg-success ms-2">Cashier</span>
                )}
                {user && user.role == 3 && (
                  <span className="badge bg-primary ms-2">Manager</span>
                )}
              </span>
              <br />
              <span className="badge bg-light text-muted quote-badge">{todayQuote}</span>
              {user && user.position && (
                <span className="badge bg-info ms-1">{user.position}</span>
              )}
            </div>
          </div>

          {/* <div className="d-flex align-items-center ms-auto">
            <form className="form-inline me-3 search-form" role="search">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-0 pe-2">
                  <i className="fas fa-search text-secondary"></i>
                </span>
                <input className="form-control border-0 bg-light" type="search" placeholder="Search..." aria-label="Search" />
              </div>
            </form>
          </div> */}
        </div>

        {/* Page Body via Router */}
        <div className="content">
          <Routes>
            <Route path="/ease-pos-cashier" element={<Navigate to="/pos" replace />} />
            <Route path="/pos" element={<Menu />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/edit-sales/:saleId" element={<MenuEdit />} />

            <Route path="*" element={<Navigate to="/ease-pos-cashier" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

// Main App Export
export default function App() {
  return (
    <Router>
      {/* <AuthCheck> */}
        <MainApp />
      {/* </AuthCheck> */}
    </Router>
  );
}