// ============================================================
// GOOGLE APPS SCRIPT — Form Submission Webhook
// Install this in: Google Forms → Extensions → Apps Script
// ============================================================

const NEXTJS_WEBHOOK_URL = "https://YOUR-DOMAIN.com/api/webhook/form-submission";
const WEBHOOK_SECRET = "YOUR_WEBHOOK_SECRET_KEY";
const ASSIGNMENT_SHEET_NAME = "Assignments";
const SPREADSHEET_ID = "YOUR_GOOGLE_SHEET_ID";

/**
 * Main trigger — attach this to: From form → On form submit
 */
function onFormSubmit(e) {
  try {
    const formResponse = e.response;
    const itemResponses = formResponse.getItemResponses();
    const timestamp = formResponse.getTimestamp();
    const respondentEmail = formResponse.getRespondentEmail();

    // Extract all answers into key-value pairs
    const answers = {};
    itemResponses.forEach(function(itemResponse) {
      const question = itemResponse.getItem().getTitle();
      const answer = itemResponse.getResponse();
      answers[question] = Array.isArray(answer) ? answer.join(", ") : answer;
    });

    // Find candidate name — update these keys to match your exact form question text
    const candidateName =
      answers["Nama Lengkap Siswa"] ||
      answers["Nama Siswa"] ||
      answers["Nama Lengkap"] ||
      answers["Nama Anak"] ||
      "Unknown";

    // Look up assigned interviewer from Assignments sheet
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const assignSheet = ss.getSheetByName(ASSIGNMENT_SHEET_NAME);
    const assignData = assignSheet.getDataRange().getValues();

    let assignedInterviewer = null;
    let candidateLevel = null;

    for (let i = 1; i < assignData.length; i++) {
      const rowName = assignData[i][0];
      if (rowName && rowName.toString().toLowerCase() === candidateName.toLowerCase()) {
        assignedInterviewer = {
          name: assignData[i][1],
          email: assignData[i][2],
        };
        candidateLevel = assignData[i][3]; // "SD" or "SMP"
        break;
      }
    }

    // Build payload
    const payload = {
      secret: WEBHOOK_SECRET,
      timestamp: timestamp.toISOString(),
      respondentEmail: respondentEmail || null,
      candidateName: candidateName,
      level: candidateLevel || "Unknown",
      answers: answers,
      assignedInterviewer: assignedInterviewer,
    };

    // POST to Next.js webhook endpoint
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(NEXTJS_WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();

    // Log sync status
    let syncSheet = ss.getSheetByName("SyncLog");
    if (!syncSheet) {
      syncSheet = ss.insertSheet("SyncLog");
      syncSheet.appendRow(["Timestamp", "Nama Kandidat", "Jenjang", "Status", "Respons"]);
    }

    syncSheet.appendRow([
      timestamp,
      candidateName,
      candidateLevel || "Unknown",
      responseCode === 200 ? "SUCCESS" : "FAILED",
      response.getContentText(),
    ]);

    Logger.log("Webhook sent for " + candidateName + ": " + responseCode);

  } catch (error) {
    Logger.log("Error in onFormSubmit: " + error.toString());
  }
}

/**
 * Manual trigger for testing
 * Run this from the Apps Script editor to test the webhook
 */
function testWebhook() {
  const testPayload = {
    secret: WEBHOOK_SECRET,
    timestamp: new Date().toISOString(),
    candidateName: "Test Candidate",
    level: "SMP",
    answers: {
      "Nama Siswa": "Test Candidate",
      "Motivasi Masuk Sekolah": "Ingin mendapatkan pendidikan berkualitas",
    },
    assignedInterviewer: {
      name: "Pewawancara Test",
      email: "test@alfakhir.sch.id",
    },
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(testPayload),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(NEXTJS_WEBHOOK_URL, options);
  Logger.log("Test response (" + response.getResponseCode() + "): " + response.getContentText());
}

/**
 * Setup: Run this once to create required sheet structure
 */
function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const required = ["Assignments", "Responses_SD", "Responses_SMP", "Notes", "AI_Summaries", "SyncLog"];
  required.forEach(function(sheetName) {
    if (!ss.getSheetByName(sheetName)) {
      ss.insertSheet(sheetName);
      Logger.log("Created sheet: " + sheetName);
    }
  });

  // Setup Assignments headers
  const assignSheet = ss.getSheetByName("Assignments");
  if (assignSheet.getLastRow() === 0) {
    assignSheet.appendRow(["NamaKandidat", "NamaPewawancara", "EmailPewawancara", "Jenjang", "Status"]);
  }

  // Setup Notes headers
  const notesSheet = ss.getSheetByName("Notes");
  if (notesSheet.getLastRow() === 0) {
    notesSheet.appendRow([
      "NoteId", "CandidateId", "InterviewerEmail", "InterviewerName",
      "Observation", "AcademicAssessment", "FamilySupport", "CharacterNotes",
      "Recommendation", "SubmittedAt", "IsLocked", "AiSummary"
    ]);
  }

  Logger.log("Sheet setup complete!");
}
