const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const DB_FILE = "db.json";

// ================= CREATE DB =================
if (!fs.existsSync(DB_FILE)) {

  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(
      {
        users: [],
        hireRequests: []
      },
      null,
      2
    )
  );
}

// ================= READ DB =================
function readDB() {

  return JSON.parse(
    fs.readFileSync(DB_FILE, "utf8")
  );
}

// ================= SAVE DB =================
function saveDB(data) {

  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(data, null, 2)
  );
}

// ================= HOME =================
app.get("/", (req, res) => {

  res.send("Farmora backend running");
});

// ================= REGISTER =================
app.post("/register", (req, res) => {

  const db = readDB();

  const user = req.body;

  const exists = db.users.find(
    u =>
      u.email === user.email &&
      u.role === user.role
  );

  if (exists) {

    return res.status(400).json({
      message: "Account already exists"
    });
  }

  user.id = Date.now().toString();

  db.users.push(user);

  saveDB(db);

  res.json({
    message: "Registered successfully"
  });
});

// ================= LOGIN =================
app.post("/login", (req, res) => {

  const db = readDB();

  const { email, password, role } = req.body;

  const user = db.users.find(
    u =>
      u.email === email &&
      u.password === password &&
      u.role === role
  );

  if (!user) {

    return res.status(401).json({
      message: "Invalid credentials"
    });
  }

  res.json(user);
});

// ================= VERIFY SECURITY =================
app.post("/verify-security", (req, res) => {

  const db = readDB();

  const {
    email,
    secColor,
    secFood
  } = req.body;

  const user = db.users.find(
    u => u.email === email
  );

  if (!user) {

    return res.status(404).json({
      message: "User not found"
    });
  }

  if (
    user.secColor.toLowerCase() !==
      secColor.toLowerCase() ||

    user.secFood.toLowerCase() !==
      secFood.toLowerCase()
  ) {

    return res.status(401).json({
      message: "Wrong security answers"
    });
  }

  res.json({
    message: "Verified"
  });
});

// ================= FORGOT PASSWORD =================
app.post("/forgot-password", (req, res) => {

  const db = readDB();

  const {
    email,
    secColor,
    secFood,
    newPassword
  } = req.body;

  const user = db.users.find(
    u => u.email === email
  );

  if (!user) {

    return res.status(404).json({
      message: "User not found"
    });
  }

  if (
    user.secColor.toLowerCase() !==
      secColor.toLowerCase() ||

    user.secFood.toLowerCase() !==
      secFood.toLowerCase()
  ) {

    return res.status(401).json({
      message: "Wrong security answers"
    });
  }

  user.password = newPassword;

  saveDB(db);

  res.json({
    message: "Password updated"
  });
});

// ================= GET WORKERS =================
app.get("/workers", (req, res) => {

  const db = readDB();

  const workers = db.users.filter(
    u => u.role === "worker"
  );

  res.json(workers);
});

// ================= EDIT PROFILE =================
app.put("/edit-profile/:id", (req, res) => {

  const db = readDB();

  const id = req.params.id;

  const index = db.users.findIndex(
    u => u.id === id
  );

  if (index === -1) {

    return res.status(404).json({
      message: "User not found"
    });
  }

  db.users[index] = {
    ...db.users[index],
    ...req.body
  };

  saveDB(db);

  res.json({
    message: "Profile updated",
    user: db.users[index]
  });
});

// ================= HIRE WORKER =================
app.post("/hire", (req, res) => {

  const db = readDB();

  const hire = req.body;

  const alreadyHired = db.hireRequests.find(
    h =>
      h.workerId === hire.workerId &&
      h.status === "accepted"
  );

  if (alreadyHired) {

    return res.status(400).json({
      message: "Worker already hired"
    });
  }

  hire.id = Date.now().toString();

  hire.status = "pending";

  db.hireRequests.push(hire);

  saveDB(db);

  res.json({
    message: "Hire request sent"
  });
});

// ================= GET WORKER REQUESTS =================
app.get("/hire-requests/:workerId", (req, res) => {

  const db = readDB();

  const workerId = req.params.workerId;

  const requests = db.hireRequests.filter(
    h => h.workerId === workerId
  );

  res.json(requests);
});

// ================= RESPOND TO HIRE =================
app.put("/hire-response/:id", (req, res) => {

  const db = readDB();

  const id = req.params.id;

  const { status } = req.body;

  const hire = db.hireRequests.find(
    h => h.id === id
  );

  if (!hire) {

    return res.status(404).json({
      message: "Request not found"
    });
  }

  hire.status = status;

  // decline other pending requests
  if (status === "accepted") {

    db.hireRequests.forEach(h => {

      if (
        h.workerId === hire.workerId &&
        h.id !== hire.id &&
        h.status === "pending"
      ) {

        h.status = "declined";
      }
    });
  }

  saveDB(db);

  res.json({
    message: "Response updated"
  });
});

// ================= ALL HIRES =================
app.get("/all-hires", (req, res) => {

  const db = readDB();

  res.json(db.hireRequests);
});

// ================= OWNER HIRES =================
app.get("/owner-hires/:id", (req, res) => {

  const db = readDB();

  const hires = db.hireRequests.filter(
    h => h.landownerId === req.params.id
  );

  const updated = hires.map(h => {

    const worker = db.users.find(
      u => u.id === h.workerId
    );

    return {
      ...h,
      workerName: worker
        ? worker.name
        : "Worker"
    };
  });

  res.json(updated);
});

// ================= START SERVER =================
app.listen(PORT, () => {

  console.log(
    `Server running on http://localhost:${PORT}`
  );
});
