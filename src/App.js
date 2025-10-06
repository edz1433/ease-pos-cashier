import React, { createContext, useContext, useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "admin-lte/dist/css/adminlte.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./styles/cashier.css";
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation, Navigate } from "react-router-dom";
import Menu from "./pages/Menu";
import Orders from "./pages/Orders";
import MenuEdit from "./pages/MenuEdit";
import AuthCheck from "./components/AuthCheck";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Create Sidebar Context
const SidebarContext = createContext();

const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

const SidebarProvider = ({ children }) => {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [forceShowSidebar, setForceShowSidebar] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarVisible(prev => !prev);
  };

  const hideSidebar = () => {
    setIsSidebarVisible(false);
    setForceShowSidebar(false);
  };

  const showSidebar = () => {
    setIsSidebarVisible(true);
  };

  const enableSidebarForEdit = () => {
    setIsSidebarVisible(true);
    setForceShowSidebar(true);
  };

  return (
    <SidebarContext.Provider
      value={{
        isSidebarVisible,
        forceShowSidebar,
        toggleSidebar,
        hideSidebar,
        showSidebar,
        enableSidebarForEdit
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

// Component to handle sidebar visibility based on route
const SidebarHandler = ({ children }) => {
  const location = useLocation();
  const { showSidebar, hideSidebar, forceShowSidebar } = useSidebar();
  
  useEffect(() => {
    // Don't change sidebar state if it's forced to show (for edit mode)
    if (forceShowSidebar) return;
    
    // Show sidebar only on the Menu page (/pos) and edit pages
    if (location.pathname === '/pos' || location.pathname.includes('/edit-sales/')) {
      showSidebar();
    } else {
      hideSidebar();
    }
  }, [location.pathname, showSidebar, hideSidebar, forceShowSidebar]);
  
  return children;
};

// Main App Component
const MainApp = ({ user, onLogout }) => {
  const { isSidebarVisible, toggleSidebar } = useSidebar();
  
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
      <div className={`content-wrapper-cashier flex-grow-1 ${!isSidebarVisible ? 'sidebar-hidden' : ''}`}>
        {/* Header */}
        <div className="content-header bg-white rounded shadow-sm d-flex justify-content-between align-items-center px-4 py-2 mb-3 header-adjust">
          <div className="d-flex align-items-center">
            <span className="user-icon">
              {user?.profile ? (
                <img
                  src={user.profile}
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
        </div>

        {/* Page Body via Router */}
        <div className="content">
          <SidebarHandler>
            <Routes>
              <Route path="/ease-pos-cashier" element={<Navigate to="/pos" replace />} />
              <Route path="/pos" element={<Menu />} />
              <Route path="/orders" element={<Orders user={user} />} />
              <Route path="/edit-sales/:saleId" element={<MenuEdit />} />
              <Route path="*" element={<Navigate to="/ease-pos-cashier" replace />} />
            </Routes>
          </SidebarHandler>
        </div>
      </div>
      
      {/* Toggle button for sidebar - only show when sidebar is available */}
      {/* {isSidebarVisible && (
        <div className="sidebar-toggle" onClick={toggleSidebar}>
          <i className="fas fa-chevron-right"></i>
        </div>
      )} */}
    </div>
  );
};

// Main App Export
export default function App() {
  return (
    <Router>
      <SidebarProvider>
        {/* <AuthCheck> */}
          <MainApp />
        {/* </AuthCheck> */}
      </SidebarProvider>
    </Router>
  );
}