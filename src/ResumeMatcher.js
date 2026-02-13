import React, { useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function ResumeMatcher({ resumeText, resumeId }) {
  const [jobs, setJobs] = useState([]);
  const [results, setResults] = useState([]);
  const [threshold, setThreshold] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const addJob = () => setJobs([...jobs, { title: "", description: "" }]);
  const removeJob = (index) => setJobs(jobs.filter((_, i) => i !== index));
  const updateJob = (index, field, value) => {
    const updatedJobs = [...jobs];
    updatedJobs[index][field] = value;
    setJobs(updatedJobs);
  };

  const handleCompare = async () => {
    setError("");
    setResults([]);
    try {
      setLoading(true);
      const response = await axios.post(
        "https://resume-screener-backend-1.onrender.com/match_multiple",
        { resume: resumeText, resume_id: resumeId, jobs }
      );
      if (response.data && response.data.results) {
        setResults(response.data.results);
      } else {
        setError("No results returned from backend.");
      }
    } catch (error) {
      console.error("Error comparing resume:", error.response?.data || error.message);
      setError("Failed to compare resume. Please check backend logs.");
    } finally {
      setLoading(false);
    }
  };

  const highlightText = (text, keywords) => {
    if (!keywords || keywords.length === 0) return text;
    const regex = new RegExp(`\\b(${keywords.join("|")})\\b`, "gi");
    return text.split(regex).map((part, i) =>
      keywords.includes(part.toLowerCase()) ? (
        <span key={i} style={{ backgroundColor: "yellow", fontWeight: "bold" }}>
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const exportCSV = () => {
    if (results.length === 0) return;
    const header = ["Job Title", "Match Score (%)", "Matched Keywords"];
    const rows = results.map(r => [
      r.title,
      r.score,
      r.keywords?.join(" | ") || "None"
    ]);
    const csvContent = [header, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "resume_match_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExcel = () => {
    if (results.length === 0) return;
    const worksheetData = results.map(r => ({
      "Job Title": r.title,
      "Match Score (%)": r.score,
      "Matched Keywords": r.keywords?.join(" | ") || "None"
    }));
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
    XLSX.writeFile(workbook, "resume_match_results.xlsx");
  };

  const filteredResults = results.filter(r => r.score >= threshold);

  const chartData = {
    labels: filteredResults.map(r => r.title),
    datasets: [
      {
        label: "Match Score (%)",
        data: filteredResults.map(r => r.score),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Resume Match Scores by Job" }
    }
  };

  return (
    <div className="card mt-4 p-3 scroll-visible">
      <h2 className="mb-3">Resume Matcher</h2>
      <button className="btn btn-outline-primary mb-3" onClick={addJob}>
        Add Job
      </button>

      {jobs.map((job, index) => (
        <div key={index} className="mb-3">
          <input
            type="text"
            placeholder="Job Title"
            value={job.title}
            onChange={(e) => updateJob(index, "title", e.target.value)}
            className="form-control mb-2"
          />
          <textarea
            placeholder="Paste Job Description"
            value={job.description}
            onChange={(e) => updateJob(index, "description", e.target.value)}
            className="form-control mb-2"
            rows={4}
          />
          <button className="btn btn-danger btn-sm" onClick={() => removeJob(index)}>
            Remove
          </button>
        </div>
      ))}

      {jobs.length > 0 && (
        <button className="btn btn-primary mt-3" onClick={handleCompare}>
          Compare All
        </button>
      )}

      {loading && <div className="loader"></div>}

      {error && (
        <div className="alert alert-danger mt-3" role="alert">
          {error}
        </div>
      )}

      {results.length === 0 && !error && jobs.length > 0 && !loading && (
        <p className="mt-3 text-muted">No results yet. Click Compare All to see matches.</p>
      )}

      {results.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <label>
            Minimum Match Score (%):{" "}
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              style={{ width: "60px", marginBottom: "10px" }}
            />
          </label>

          <table className="table table-striped table-bordered mt-3">
            <thead className="table-dark">
              <tr>
                <th>Job Title</th>
                <th>Match Score (%)</th>
                <th>Matched Keywords</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((r, i) => (
                <tr key={i}>
                  <td>{r.title}</td>
                  <td>{r.score}</td>
                  <td>{r.keywords?.length > 0 ? r.keywords.join(", ") : "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "10px" }}>
            <button className="btn btn-success" onClick={exportCSV}>Download CSV</button>
            <button className="btn btn-info ms-2" onClick={exportExcel}>
              Download Excel
            </button>
          </div>

          <div style={{ marginTop: "20px" }}>
            <Bar data={chartData} options={chartOptions} />
          </div>

          <h3 className="mt-4">Highlighted Job Descriptions</h3>
          {filteredResults.map((r, i) => (
            <div key={i} className="card p-3 mb-3">
              <h4>{r.title}</h4>
              <p>{highlightText(jobs[i].description, r.keywords)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ResumeMatcher;
