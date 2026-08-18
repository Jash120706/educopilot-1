import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  Calendar,
  Sparkles,
  Plus,
  Trash2,
  Clock,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Layers,
  FileUp,
  FileSpreadsheet,
  Image,
  CalendarDays,
  Edit3,
  Save,
  Check,
  AlertCircle,
  Users,
  Grid,
  ListOrdered,
  AlertTriangle,
  Send,
  Timer,
} from 'lucide-react';

const LectureSchedule = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [sequencing, setSequencing] = useState(false);
  const [savingBatch, setSavingBatch] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Active Import Tab: 'file' | 'manual' | 'sequencer'
  const [activeTab, setActiveTab] = useState('sequencer');

  // Multi-modal upload state
  const [importFile, setImportFile] = useState(null);
  const [defaultSubject, setDefaultSubject] = useState('Solid Waste Management');
  const [defaultCourseCode, setDefaultCourseCode] = useState('ENV-401');
  const [rawText, setRawText] = useState('');

  // AI Syllabus-to-Plan Slot Sequencer State
  const [seqSubject, setSeqSubject] = useState('Solid Waste Management');
  const [seqCourseCode, setSeqCourseCode] = useState('ENV-401');
  const [seqSyllabus, setSeqSyllabus] = useState(
    'Unit I: Definition, Sources & Types of Solid Waste. Unit II: Waste Generation Rates & Composition Analysis. Unit III: On-site Handling, Storage & Processing. Unit IV: Collection Systems, Transfer Stations & Route Optimization. Unit V: Processing, Material Recovery & Sanitary Landfill Design.'
  );
  const [seqNumPeriods, setSeqNumPeriods] = useState(5);
  const [seqMinutesPerPeriod, setSeqMinutesPerPeriod] = useState(60);
  const [seqDeadline, setSeqDeadline] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [generatedPlanResult, setGeneratedPlanResult] = useState(null);

  // Interactive Calendar / Manual Picker State
  const [manualSubject, setManualSubject] = useState('Solid Waste Management');
  const [manualCourseCode, setManualCourseCode] = useState('ENV-401');
  const [manualTitle, setManualTitle] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualTime, setManualTime] = useState('10:00 AM');
  const [manualDuration, setManualDuration] = useState(60);
  const [manualSection, setManualSection] = useState('Section A');
  const [manualTopics, setManualTopics] = useState('');

  // Editable Staging Array (Extracted before final DB commit)
  const [stagedLectures, setStagedLectures] = useState([]);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await api.get('/professor/schedules');
      setSchedules(res.data);
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Handle AI Syllabus-to-Plan Slot Sequencer
  const handleGenerateSlotPlan = async (e) => {
    e.preventDefault();
    setSequencing(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.post('/professor/schedules/suggest', {
        subject: seqSubject,
        courseCode: seqCourseCode,
        syllabus: seqSyllabus,
        topicsList: seqSyllabus,
        numPeriods: seqNumPeriods,
        minutesPerPeriod: seqMinutesPerPeriod,
        deadline: seqDeadline,
      });

      setGeneratedPlanResult(res.data);
      setSuccessMsg(
        `Generated ${res.data.plan?.length || seqNumPeriods}-period dependency plan based on prerequisites and time budget!`
      );
    } catch (err) {
      console.error('Sequencing error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to sequence syllabus.');
    } finally {
      setSequencing(false);
    }
  };

  // Commit Generated Slot Plan directly to Staging Table
  const handleStageGeneratedPlan = () => {
    if (!generatedPlanResult || !generatedPlanResult.plan) return;

    const startDate = new Date();
    const newStaged = generatedPlanResult.plan.map((slot, index) => {
      // Calculate a date sequence (every 2 days)
      const slotDate = new Date(startDate);
      slotDate.setDate(startDate.getDate() + index * 2);

      return {
        courseCode: seqCourseCode || 'ENV-401',
        subject: seqSubject || 'Solid Waste Management',
        title: slot.topic,
        date: slotDate.toISOString().split('T')[0],
        time: '10:00 AM',
        durationMinutes: Number(seqMinutesPerPeriod) || 60,
        classOrSection: 'Section A',
        topics: slot.subtopics || [slot.topic],
        learningObjectives: [`Prerequisites: ${slot.prerequisites?.join(', ') || 'Foundational'}`],
        aiSequencingNotes: `Period ${slot.period} (${slot.type}): ${slot.prerequisites?.length ? 'Builds on ' + slot.prerequisites.join(', ') : 'Initial Foundation'}`,
        prerequisites: slot.prerequisites || [],
      };
    });

    setStagedLectures([...stagedLectures, ...newStaged]);
    setSuccessMsg(`Pushed ${newStaged.length} plan slots to the staging table below!`);
  };

  // 2. Handle Multi-Modal Timetable Import (PDF, Excel, Image, Text)
  const handleImportTimetable = async (e) => {
    e.preventDefault();
    setImporting(true);
    setError('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      if (importFile) {
        formData.append('file', importFile);
      }
      if (rawText && rawText.trim()) {
        formData.append('rawText', rawText);
      }
      formData.append('defaultSubject', defaultSubject);
      formData.append('defaultCourseCode', defaultCourseCode);

      const res = await api.post('/professor/schedules/import', formData);
      const extracted = res.data.extractedLectures || [];
      if (extracted.length === 0) {
        setError('No lecture items could be extracted. Try adjusting the document or pasting text.');
      } else {
        setStagedLectures(extracted);
        setSuccessMsg(
          `Extracted ${extracted.length} lecture sessions into the staging table below. Review and edit before saving!`
        );
      }
    } catch (err) {
      console.error('Import error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to import timetable.');
    } finally {
      setImporting(false);
    }
  };

  // 3. Add a manual item to the staging table
  const handleAddManualToStaging = (e) => {
    e.preventDefault();
    if (!manualTitle) return;

    const newLecture = {
      courseCode: manualCourseCode,
      subject: manualSubject,
      title: manualTitle,
      date: manualDate,
      time: manualTime,
      durationMinutes: Number(manualDuration) || 60,
      classOrSection: manualSection,
      topics: manualTopics ? manualTopics.split(',').map((t) => t.trim()) : [manualTitle],
      learningObjectives: [],
      aiSequencingNotes: 'Manually scheduled by professor.',
    };

    setStagedLectures([...stagedLectures, newLecture]);
    setManualTitle('');
    setManualTopics('');
    setSuccessMsg('Added lecture to staging area.');
  };

  // Update a staged row
  const handleUpdateStagedField = (index, field, value) => {
    const updated = [...stagedLectures];
    updated[index] = { ...updated[index], [field]: value };
    setStagedLectures(updated);
  };

  // Delete a staged row
  const handleDeleteStagedRow = (index) => {
    setStagedLectures(stagedLectures.filter((_, i) => i !== index));
  };

  // Save all staged lectures to the database
  const handleSaveAllStaged = async () => {
    if (stagedLectures.length === 0) return;
    setSavingBatch(true);
    setError('');

    try {
      const res = await api.post('/professor/schedules/batch', {
        lectures: stagedLectures,
      });
      setSuccessMsg(res.data.message || 'Successfully saved all lectures to your calendar.');
      setStagedLectures([]);
      fetchSchedules();
    } catch (err) {
      console.error('Batch save error:', err);
      setError(err.response?.data?.error || 'Failed to save lectures to calendar.');
    } finally {
      setSavingBatch(false);
    }
  };

  // Delete an existing schedule from database
  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Delete this scheduled lecture?')) return;
    try {
      await api.delete(`/professor/schedules/${id}`);
      fetchSchedules();
    } catch (err) {
      alert('Failed to delete schedule.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Calendar className="w-7 h-7 text-blue-600" />
          <span>Lecture Scheduling & Timetable Planner</span>
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Convert syllabi into slot-by-slot prerequisite plans, import timetables from PDF/Excel/OCR photos, or manually organize your lecture calendar.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-2xl flex items-start gap-3 text-xs text-green-800 dark:text-green-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3 text-xs text-red-800 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Mode Navigation Tabs */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('sequencer')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'sequencer'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>AI Syllabus-to-Plan Slot Sequencer</span>
            </button>
            <button
              onClick={() => setActiveTab('file')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'file'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <FileUp className="w-4 h-4" />
              <span>Multi-Modal Import (PDF, Excel, Image)</span>
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'manual'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Manual Entry & Custom Slot</span>
            </button>
          </div>
        </div>

        {/* TAB 1: AI SYLLABUS-TO-PLAN SLOT SEQUENCER */}
        {activeTab === 'sequencer' && (
          <form onSubmit={handleGenerateSlotPlan} className="space-y-5">
            <div className="p-4 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-start gap-3 text-xs text-blue-900 dark:text-blue-300">
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm font-bold text-blue-950 dark:text-blue-200">
                  Lecture-Scheduling Assistant
                </strong>
                <span>
                  Provide your subject, syllabus text, period constraints, and target deadline. The assistant will decompose the topics into prerequisite order, estimate duration per slot, and flag at-risk topics.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  value={seqSubject}
                  onChange={(e) => setSeqSubject(e.target.value)}
                  placeholder="e.g. Solid Waste Management"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Course Code
                </label>
                <input
                  type="text"
                  value={seqCourseCode}
                  onChange={(e) => setSeqCourseCode(e.target.value)}
                  placeholder="ENV-401"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                />
              </div>
            </div>

            {/* Syllabus Text */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Syllabus Content (Units, Chapters & Topics)
              </label>
              <textarea
                rows={4}
                required
                value={seqSyllabus}
                onChange={(e) => setSeqSyllabus(e.target.value)}
                placeholder="Unit I: Definition & Types of Solid Waste. Unit II: Waste Generation Rates & Composition..."
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
              />
            </div>

            {/* Slot & Time Constraints */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Number of Periods
                </label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  required
                  value={seqNumPeriods}
                  onChange={(e) => setSeqNumPeriods(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Minutes Per Period
                </label>
                <input
                  type="number"
                  min="15"
                  max="180"
                  required
                  value={seqMinutesPerPeriod}
                  onChange={(e) => setSeqMinutesPerPeriod(Math.max(15, parseInt(e.target.value) || 60))}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Deadline Date
                </label>
                <input
                  type="date"
                  required
                  value={seqDeadline}
                  onChange={(e) => setSeqDeadline(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={sequencing || !seqSubject || !seqSyllabus}
              className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {sequencing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Computing Prerequisite Order & Slot Plan...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate Slot-by-Slot Plan</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 2: MULTI-MODAL FILE / IMAGE / TEXT IMPORT */}
        {activeTab === 'file' && (
          <form onSubmit={handleImportTimetable} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Default Course Code
                </label>
                <input
                  type="text"
                  value={defaultCourseCode}
                  onChange={(e) => setDefaultCourseCode(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={defaultSubject}
                  onChange={(e) => setDefaultSubject(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                />
              </div>
            </div>

            {/* File Upload Area */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Upload Document or Photo (PDF, Excel, CSV, PNG, JPG)
              </label>
              {importFile ? (
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl">
                  <div className="flex items-center gap-3">
                    {importFile.name.endsWith('.xlsx') || importFile.name.endsWith('.csv') ? (
                      <FileSpreadsheet className="w-6 h-6 text-green-600" />
                    ) : importFile.type.includes('image') ? (
                      <Image className="w-6 h-6 text-amber-600" />
                    ) : (
                      <FileUp className="w-6 h-6 text-blue-600" />
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{importFile.name}</p>
                      <p className="text-[10px] text-slate-500">{(importFile.size / 1024).toFixed(1)} KB • Ready for extraction</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImportFile(null)}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-2xl cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-3 pb-3">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <FileUp className="w-5 h-5 text-blue-600" />
                      <FileSpreadsheet className="w-5 h-5 text-green-600" />
                      <Image className="w-5 h-5 text-amber-600" />
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                      Click to upload Syllabus PDF, Excel Timetable, or Timetable Photo
                    </p>
                    <p className="text-[10px] text-slate-400">PDF, XLSX, CSV, PNG, JPG, WEBP</p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp,.txt"
                    onChange={(e) => setImportFile(e.target.files[0] || null)}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Or Paste Raw Text */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Or Paste Timetable / Syllabus Content
              </label>
              <textarea
                rows={3}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="e.g. Mon 10:00 AM - Section A: Definition & Types of Solid Waste..."
                className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={importing || (!importFile && (!rawText || rawText.trim().length < 5))}
              className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {importing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Extracting Schedule with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Extract & Stage Lectures</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 3: CALENDAR ENTRY & MANUAL TYPING */}
        {activeTab === 'manual' && (
          <form onSubmit={handleAddManualToStaging} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Course Code
                </label>
                <input
                  type="text"
                  value={manualCourseCode}
                  onChange={(e) => setManualCourseCode(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={manualSubject}
                  onChange={(e) => setManualSubject(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Class / Section
                </label>
                <input
                  type="text"
                  value={manualSection}
                  onChange={(e) => setManualSection(e.target.value)}
                  placeholder="Section A"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Time Slot
                </label>
                <input
                  type="text"
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  placeholder="10:00 AM"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  value={manualDuration}
                  onChange={(e) => setManualDuration(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Lecture Topic / Title
              </label>
              <input
                type="text"
                required
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="e.g. Sanitary Landfill Design & Leachate Management"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Subtopics (Comma separated)
              </label>
              <input
                type="text"
                value={manualTopics}
                onChange={(e) => setManualTopics(e.target.value)}
                placeholder="Impermeable barriers, Venting, Flaring"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 py-2.5 px-5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Staging Table</span>
            </button>
          </form>
        )}
      </div>

      {/* GENERATED SLOT-BY-SLOT PLAN RESULTS CARD */}
      {generatedPlanResult && generatedPlanResult.plan && (
        <div className="p-6 bg-white dark:bg-slate-900 border-2 border-blue-500/50 rounded-3xl shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Slot-by-Slot Prerequisite Plan ({generatedPlanResult.plan.length} Periods)
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Optimized pedagogical sequence with computed dependency order, subtopics, and time estimates.
              </p>
            </div>

            <button
              type="button"
              onClick={handleStageGeneratedPlan}
              className="flex items-center gap-2 py-2.5 px-5 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/20"
            >
              <Send className="w-4 h-4" />
              <span>Stage into Lecture Schedule</span>
            </button>
          </div>

          {/* At-Risk Topics Alert Banner (if any) */}
          {generatedPlanResult.at_risk_topics && generatedPlanResult.at_risk_topics.length > 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-1">
                  At-Risk Topics (Exceeding Time Budget before Deadline):
                </strong>
                <ul className="list-disc pl-4 space-y-1">
                  {generatedPlanResult.at_risk_topics.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Slot Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {generatedPlanResult.plan.map((slot, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 uppercase tracking-wider font-mono">
                    PERIOD {slot.period} • {slot.type || 'lecture'}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5" />
                    <span>{seqMinutesPerPeriod}m</span>
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {slot.topic}
                </h3>

                {/* Subtopics */}
                {slot.subtopics && slot.subtopics.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Subtopics:
                    </span>
                    <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 pl-3 list-disc">
                      {slot.subtopics.map((st, si) => (
                        <li key={si} className="text-[11px] leading-tight">
                          {st}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Prerequisites */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-semibold">Prerequisite:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400 truncate max-w-[170px]">
                    {slot.prerequisites && slot.prerequisites.length > 0
                      ? slot.prerequisites.join(', ')
                      : 'None (Foundational)'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          {generatedPlanResult.notes && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
              <strong className="text-slate-800 dark:text-slate-200">AI Curriculum Notes: </strong>
              <span>{generatedPlanResult.notes}</span>
            </div>
          )}
        </div>
      )}

      {/* EDITABLE STAGING TABLE */}
      {stagedLectures.length > 0 && (
        <div className="p-6 bg-white dark:bg-slate-900 border-2 border-blue-500/40 rounded-3xl shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Editable Staging Area ({stagedLectures.length} Lectures)
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review and modify lecture details inline before committing to the live calendar.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setStagedLectures([])}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Clear Staging
              </button>
              <button
                type="button"
                disabled={savingBatch}
                onClick={handleSaveAllStaged}
                className="flex items-center gap-2 py-2.5 px-5 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 active:scale-95 transition-all shadow-md shadow-green-500/20 disabled:opacity-50"
              >
                {savingBatch ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving to Calendar...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save All to Calendar ({stagedLectures.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Section</th>
                  <th className="py-2.5 px-3">Subject / Code</th>
                  <th className="py-2.5 px-3">Lecture Title & Topics</th>
                  <th className="py-2.5 px-3">Mins</th>
                  <th className="py-2.5 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {stagedLectures.map((lec, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={lec.date}
                        onChange={(e) => handleUpdateStagedField(idx, 'date', e.target.value)}
                        className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={lec.time || '10:00 AM'}
                        onChange={(e) => handleUpdateStagedField(idx, 'time', e.target.value)}
                        className="w-24 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={lec.classOrSection || 'Section A'}
                        onChange={(e) => handleUpdateStagedField(idx, 'classOrSection', e.target.value)}
                        className="w-24 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={`${lec.subject || 'ENV'} (${lec.courseCode || 'ENV-401'})`}
                        onChange={(e) => handleUpdateStagedField(idx, 'subject', e.target.value)}
                        className="w-32 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={lec.title}
                        onChange={(e) => handleUpdateStagedField(idx, 'title', e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold dark:text-white"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={lec.durationMinutes || 60}
                        onChange={(e) => handleUpdateStagedField(idx, 'durationMinutes', e.target.value)}
                        className="w-14 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteStagedRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ACTIVE SCHEDULED LECTURES CALENDAR & LIST */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Active Lecture Schedule ({schedules.length})
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading schedule...</div>
        ) : schedules.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
            No lectures scheduled yet. Use the slot sequencer or import above to add your timetable.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules.map((lec) => (
              <div
                key={lec._id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {lec.courseCode} • {lec.classOrSection || 'Section A'}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{lec.time} ({lec.durationMinutes}m)</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{lec.title}</h3>
                  <p className="text-xs text-slate-500">{lec.subject}</p>

                  {lec.topics && lec.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {lec.topics.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {lec.aiSequencingNotes && (
                    <p className="text-[11px] text-blue-700 dark:text-blue-300 italic pt-1 border-t border-slate-200 dark:border-slate-700">
                      {lec.aiSequencingNotes}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    {new Date(lec.date).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleDeleteSchedule(lec._id)}
                    className="text-red-600 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LectureSchedule;
