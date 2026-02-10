import React, { useState } from "react";
import axios from "axios";
import ResumeMatcher from "./ResumeMatcher";

function App() {
  const [file, setFile] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");

  // Upload resume file and extract text
  const handleUpload = async () => {
    setError("");
    setResumeText("");
    setSummary("");

    if (!file) {
      setError("Please select a file before uploading.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("resume", file); // must match backend key

      const res = await axios.post(
        "https://resume-screener-backend-1.onrender.com/upload_resume", // ✅ use correct backend URL
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (res.data.resume_text && res.data.resume_text.trim().length > 0) {
        setResumeText(res.data.resume_text);
      } else {
        setError("No text was extracted from the resume. Try a different file.");
      }
    } catch (err) {
      console.error("Error uploading resume:", err.response?.data || err.message);
      setError("Failed to upload or extract resume. Please check the backend logs.");
    }
  };

  // Generate summary from extracted resume text
  const handleGenerateSummary = async () => {
    if (!resumeText) {
      setError("No resume text available to summarize.");
      return;
    }

    try {
      const res = await axios.post(
        "https://resume-screener-backend-1.onrender.com/resume_summary", // ✅ consistent backend URL
        { resume: resumeText }
      );
      setSummary(res.data.summary);
    } catch (error) {
      console.error("Error generating summary:", error.response?.data || error.message);
      setError("Failed to generate summary.");
    }
  };

  return (
    <div className="App container mt-4">
      <h1 className="mb-4">Resume Screener</h1>

      {/* Upload Resume */}
      <div className="row mb-3">
        <div className="col-md-8">
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(e) => setFile(e.target.files[0])}
            className="form-control"
          />
        </div>
        <div className="col-md-4 d-flex align-items-center">
          <button className="btn btn-primary w-100" onClick={handleUpload}>
            Upload
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-danger mt-3" role="alert">
          {error}
        </div>
      )}

      {/* Show extracted resume text */}
      {resumeText && (
        <div className="mt-4">
          <h3>Extracted Resume Text</h3>
          <pre
            className="p-3 bg-light border rounded"
            style={{ maxHeight: "200px", overflowY: "auto" }}
          >
            {resumeText}
          </pre>

          {/* Generate Summary Button */}
          <button
            className="btn btn-secondary mt-3"
            onClick={handleGenerateSummary}
          >
            Generate Resume Summary
          </button>

          {/* Show Summary */}
          {summary && (
            <div className="card mt-3">
              <div className="card-body">
                <h5 className="card-title">Resume Summary</h5>
                <p className="card-text">{summary}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resume Matcher Component */}
      <ResumeMatcher resumeText={resumeText} />
    </div>
  );
}

export default App;
