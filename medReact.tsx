import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './src/styles.css';

// Define interfaces for type safety
interface Medicine {
  id: number;
  name: string;
  uses: string[];
  sideEffects: string[];
  substitutes: string[];
  "Chemical Class": string;
  "Habit Forming": string;
  "Therapeutic Class": string;
  "Action Class": string;
}

interface Reminder {
  id: number;
  medicineName: string;
  time: string;
  medicineId?: number;
  lastTriggered?: string;
}

interface HomePageProps {
  setCurrentPage: (page: 'home' | 'findMedicine' | 'myMedications' | 'medicineDetail') => void;
}

interface FindMedicinePageProps {
  onMedicineSelect: (medicine: Medicine) => void;
}

interface MyMedicationsPageProps {
  reminders: Reminder[];
  setReminders: React.Dispatch<React.SetStateAction<Reminder[]>>;
}

interface MedicineDetailPageProps {
  medicine: Medicine;
}

interface NotificationModalProps {
  message: string;
  show: boolean;
  onClose: () => void;
}

// Helper function to format time for reminders
const formatTime = (date: Date) => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
};

// Debounce utility function
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// Main App Component
function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'findMedicine' | 'myMedications' | 'medicineDetail'>('home');
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    try {
      const storedReminders = localStorage.getItem('medicineReminders');
      return storedReminders ? JSON.parse(storedReminders) : [];
    } catch (e) {
      console.error("Failed to parse reminders from localStorage:", e);
      return [];
    }
  });
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Save reminders to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('medicineReminders', JSON.stringify(reminders));
    } catch (e) {
      console.error("Failed to save reminders to localStorage:", e);
    }
  }, [reminders]);

  // Set up reminder alarms
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      reminders.forEach((reminder: any) => {
        const [hours, minutes] = reminder.time.split(':').map(Number);
        const reminderTime = new Date();
        reminderTime.setHours(hours);
        reminderTime.setMinutes(minutes);
        reminderTime.setSeconds(0);
        reminderTime.setMilliseconds(0);

        // Check if current time is within a minute of the reminder time
        // And if the reminder hasn't been triggered recently for today
        if (
            Math.abs(now.getTime() - reminderTime.getTime()) < 60 * 1000 && // within 1 minute
            now.getDate() === reminderTime.getDate() // same day
        ) {
          // Simple check to prevent multiple triggers within the same minute on the same day
          if (reminder.lastTriggered === undefined || (now.getTime() - new Date(reminder.lastTriggered).getTime()) > 60 * 1000) {
              setNotificationMessage(`Time to take ${reminder.medicineName}!`);
              setShowNotification(true);
              // Update reminder to mark it as triggered
              setReminders(prevReminders =>
                  prevReminders.map(r =>
                      r.id === reminder.id ? { ...r, lastTriggered: now.toISOString() } : r
                  )
              );
              if (notificationTimeoutRef.current) {
                clearTimeout(notificationTimeoutRef.current);
              }
              notificationTimeoutRef.current = setTimeout(() => {
                setShowNotification(false);
              }, 5000); // Hide message after 5 seconds
          }
        }
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval); // Clean up interval on component unmount
  }, [reminders]);


  // Handles navigation to medicine details
  const handleMedicineSelect = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setCurrentPage('medicineDetail');
  };

  // Notification Modal Component
  const NotificationModal = ({ message, show, onClose }: { message: string; show: boolean; onClose: () => void }) => {
    if (!show) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl text-center max-w-sm w-full">
          <p className="text-xl font-semibold mb-4 text-gray-800">{message}</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200"
          >
            Got It!
          </button>
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-gray-100 font-inter text-gray-800 flex flex-col">
      <NotificationModal message={notificationMessage} show={showNotification} onClose={() => setShowNotification(false)} />

      {/* Header/Navigation */}
      <nav className="bg-blue-600 p-4 shadow-md flex justify-around items-center flex-wrap">
        <button
          onClick={() => setCurrentPage('home')}
          className="text-white text-lg font-bold px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200 my-1"
        >
          Home
        </button>
        <button
          onClick={() => setCurrentPage('findMedicine')}
          className="text-white text-lg font-bold px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200 my-1"
        >
          Find Medicine
        </button>
        <button
          onClick={() => setCurrentPage('myMedications')}
          className="text-white text-lg font-bold px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200 my-1"
        >
          My Medications
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow p-4 md:p-8 overflow-y-auto">
        {currentPage === 'home' && (
          <HomePage setCurrentPage={setCurrentPage} />
        )}
        {currentPage === 'findMedicine' && (
          <FindMedicinePage onMedicineSelect={handleMedicineSelect} />
        )}
        {currentPage === 'myMedications' && (
          <MyMedicationsPage reminders={reminders} setReminders={setReminders} />
        )}
        {currentPage === 'medicineDetail' && selectedMedicine && (
          <MedicineDetailPage medicine={selectedMedicine} />
        )}
      </main>
    </div>
  );
}

// Medicine Detail Page Component
function MedicineDetailPage({ medicine }: MedicineDetailPageProps) {
  if (!medicine) {
    return <div className="text-center text-gray-600">No medicine selected.</div>;
  }

  // Helper function to render a list of items
  const renderList = (title: string, items: string[] | undefined) => {
    if (!items || items.length === 0) {
      return (
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">{title}:</h3>
          <p className="text-gray-600 italic">No information available.</p>
        </div>
      );
    }
    return (
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-700 mb-2">{title}:</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-3xl font-bold mb-6 text-blue-600">{medicine.name}</h2>
      
      {renderList('Uses', medicine.uses)}
      {renderList('Side Effects', medicine.sideEffects)}
      {renderList('Substitutes', medicine.substitutes)}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Chemical Class</h3>
          <p className="text-gray-600">{medicine["Chemical Class"]}</p>
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Habit Forming</h3>
          <p className="text-gray-600">{medicine["Habit Forming"]}</p>
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Therapeutic Class</h3>
          <p className="text-gray-600">{medicine["Therapeutic Class"]}</p>
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Action Class</h3>
          <p className="text-gray-600">{medicine["Action Class"]}</p>
        </div>
      </div>
    </div>
  );
}

// HomePage Component
const HomePage = ({ setCurrentPage }: { setCurrentPage: (page: 'home' | 'findMedicine' | 'myMedications' | 'medicineDetail') => void }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-center mb-8 text-blue-600">Welcome to Medicine App</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition duration-200">
          <h2 className="text-2xl font-semibold mb-4 text-blue-600">Find Medicine</h2>
          <p className="text-gray-600 mb-4">Search for medicines, learn about their uses, side effects, and find substitutes.</p>
          <button
            onClick={() => setCurrentPage('findMedicine')}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200"
          >
            Search Medicines
          </button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition duration-200">
          <h2 className="text-2xl font-semibold mb-4 text-blue-600">My Medications</h2>
          <p className="text-gray-600 mb-4">Set reminders for your medications and track your medicine schedule.</p>
          <button
            onClick={() => setCurrentPage('myMedications')}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200"
          >
            View My Medications
          </button>
        </div>
      </div>
    </div>
  );
};

// Find Medicine Page Component (Symptom-Based Recommendation)
function FindMedicinePage({ onMedicineSelect }: FindMedicinePageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMedicines, setFilteredMedicines] = useState<Medicine[]>([]);
  const [searchInitiated, setSearchInitiated] = useState(false);
  const [allMedicines, setAllMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch medicine data
  useEffect(() => {
    const fetchMedicineData = async () => {
      try {
        const response = await fetch('/processed_medicine_data.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAllMedicines(data);
        setIsLoading(false);
      } catch (e) {
        console.error("Failed to load medicine data:", e);
        setError("Failed to load medicines. Please try again later.");
        setIsLoading(false);
      }
    };
    fetchMedicineData();
  }, []);

  // Memoize the search function
  const updateSearch = React.useCallback(
    debounce((term: string) => {
      if (!term.trim() || term.length < 2) {
        setFilteredMedicines([]);
        setSearchInitiated(false);
        return;
      }

      const lowerCaseSearchTerm = term.toLowerCase();
      const results = allMedicines
        .filter(medicine => {
          // Check name first (faster)
          if (medicine.name.toLowerCase().includes(lowerCaseSearchTerm)) {
            return true;
          }
          // Then check uses (slower)
          return medicine.uses.some(use => 
            use.toLowerCase().includes(lowerCaseSearchTerm)
          );
        })
        .slice(0, 50); // Limit results to improve performance

      setFilteredMedicines(results);
      setSearchInitiated(true);
    }, 300),
    [allMedicines]
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    updateSearch(value);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-lg text-gray-700">Loading medicine data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4 rounded-md bg-red-100 max-w-md mx-auto">
        <p className="font-bold text-lg mb-2">Error Loading Data:</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-xl max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">Find Medicines by Symptom or Name</h2>
      <div className="mb-6">
        <input
          type="text"
          placeholder="Enter symptom or medicine name (e.g., Headache, Fever)"
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
        />
      </div>

      {searchTerm.length > 0 && searchInitiated && filteredMedicines.length === 0 && (
        <p className="text-center text-gray-600">No medicines found for "{searchTerm}". Please try a different symptom or name.</p>
      )}

      <ul className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
        {filteredMedicines.map(medicine => (
          <li
            key={medicine.id}
            className="p-4 bg-gray-50 rounded-lg shadow-sm hover:bg-blue-50 cursor-pointer transition duration-200 flex justify-between items-center"
            onClick={() => onMedicineSelect(medicine)}
          >
            <div>
              <span className="text-lg font-medium text-gray-900">{medicine.name}</span>
              {medicine.uses && medicine.uses.length > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  Uses: {medicine.uses.slice(0, 2).join(', ')}{medicine.uses.length > 2 ? '...' : ''}
                </p>
              )}
            </div>
            <span className="text-sm text-blue-600">View Details →</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// My Medications Page Component (Adherence Reminder)
function MyMedicationsPage({ reminders, setReminders }: MyMedicationsPageProps) {
  const [medicineName, setMedicineName] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [searchSuggestions, setSearchSuggestions] = useState<Medicine[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Medicine | null>(null);
  const [allMedicines, setAllMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Load all medicines data once
  useEffect(() => {
    const fetchMedicineData = async () => {
      try {
        const response = await fetch('/processed_medicine_data.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAllMedicines(data);
        setIsLoading(false);
      } catch (e) {
        console.error("Failed to load medicine data:", e);
        setError("Failed to load medicines. Please try again later.");
        setIsLoading(false);
      }
    };
    fetchMedicineData();
  }, []);

  // Memoize the search function
  const updateSuggestions = React.useCallback(
    debounce((term: string) => {
      if (!allMedicines.length || term.length < 2) {
        setSearchSuggestions([]);
        return;
      }
      const suggestions = allMedicines
        .filter(med => med.name.toLowerCase().includes(term.toLowerCase()))
        .slice(0, 10);
      setSearchSuggestions(suggestions);
    }, 300),
    [allMedicines]
  );

  // Handle medicine name input change
  const handleMedicineNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMedicineName(value);
    setSelectedSuggestion(null);
    updateSuggestions(value);
  };

  const handleSuggestionClick = (med: Medicine) => {
    setMedicineName(med.name);
    setSelectedSuggestion(med);
    setSearchSuggestions([]);
  };

  const handleAddReminder = () => {
    if (!selectedSuggestion) {
      console.log("Please select a medicine from the suggestions.");
      return;
    }
    const newReminderItem: Reminder = {
      id: Date.now(),
      medicineName: selectedSuggestion.name,
      time: reminderTime,
      medicineId: selectedSuggestion.id
    };
    setReminders(prev => [...prev, newReminderItem]);
    setMedicineName('');
    setReminderTime('09:00');
    setSelectedSuggestion(null);
    setShowAddModal(false);
  };

  const handleDeleteReminder = (id: number) => {
    setReminders(prev => prev.filter(reminder => reminder.id !== id));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-lg text-gray-700">Loading your medications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4 rounded-md bg-red-100 max-w-md mx-auto">
        <p className="font-bold text-lg mb-2">Error Loading Data:</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-center text-blue-600">My Medications</h2>
      <button
        onClick={() => setShowAddModal(true)}
        className="mb-6 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition duration-200"
      >
        Add Reminder
      </button>

      <div className="grid gap-4">
        {reminders.map((reminder: any) => (
          <div key={reminder.id} className="bg-white p-4 rounded-lg shadow-md flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-blue-600">{reminder.medicineName}</h3>
              <p className="text-gray-600">Time: {reminder.time}</p>
            </div>
            <button
              onClick={() => handleDeleteReminder(reminder.id)}
              className="text-red-600 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <h3 className="text-xl font-semibold mb-4">Add Medication Reminder</h3>
            <input
              type="text"
              placeholder="Medicine Name"
              value={medicineName}
              onChange={handleMedicineNameChange}
              className="w-full p-2 mb-4 border border-gray-300 rounded-md"
            />
            {searchSuggestions.length > 0 && (
              <ul className="max-h-40 overflow-y-auto custom-scrollbar mb-4">
                {searchSuggestions.map(med => (
                  <li
                    key={med.id}
                    className="p-2 bg-gray-50 rounded-md shadow-sm hover:bg-blue-50 cursor-pointer transition duration-200"
                    onClick={() => handleSuggestionClick(med)}
                  >
                    {med.name}
                  </li>
                ))}
              </ul>
            )}
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="w-full p-2 mb-4 border border-gray-300 rounded-md"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddReminder}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Initialize the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
