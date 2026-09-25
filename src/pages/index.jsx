import React, { useState } from 'react'
import DashboardScreen from '../screens/DashboardScreen'
import CalendarGrid from '../components/Calendar/CalendarGrid'
import AnalyticsScreen from '../screens/AnalyticsScreen'
import DayChecklist from '../components/Calendar/DayChecklist'
import CanvasNoteScreen from '../screens/CanvasNoteScreen'
import Navigation from '../components/UI/Navigation'

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedDate, setSelectedDate] = useState(null)
  const [activeModal, setActiveModal] = useState(null)

  const handleSelectDay = (dateStr) => {
    setSelectedDate(dateStr)
    setActiveModal('checklist')
  }

  const handleCloseModal = () => {
    setActiveModal(null)
    setSelectedDate(null)
  }

  const handleSwitchToCanvas = () => {
    setActiveModal('canvas')
  }

  const handleSwitchToChecklist = () => {
    setActiveModal('checklist')
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {activeTab === 'dashboard' && <DashboardScreen />}
      
      {activeTab === 'calendar' && (
        <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
          <CalendarGrid onSelectDay={handleSelectDay} />
        </div>
      )}
      
      {activeTab === 'analytics' && <AnalyticsScreen />}

      {activeModal === 'checklist' && selectedDate && (
        <DayChecklist 
          selectedDate={selectedDate} 
          onClose={handleCloseModal}
          onSwitchToCanvas={handleSwitchToCanvas}
        />
      )}

      {activeModal === 'canvas' && selectedDate && (
        <CanvasNoteScreen 
          selectedDate={selectedDate} 
          onClose={handleCloseModal}
          onSwitchToChecklist={handleSwitchToChecklist}
        />
      )}

      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  )
}
