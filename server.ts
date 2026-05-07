import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
const UPLOADS_DIR = path.join(__dirname, "uploads");

const FILE_PATHS = {
  expenses: path.join(DATA_DIR, "expenses.json"),
  notes: path.join(DATA_DIR, "notes.json"),
  nutrition: path.join(DATA_DIR, "nutrition.json"),
  jobs: path.join(DATA_DIR, "jobs.json"),
  customFoodCatalog: path.join(DATA_DIR, "customFoodCatalog.json"),
  bodyProfile: path.join(DATA_DIR, "bodyProfile.json"),
  workouts: path.join(DATA_DIR, "workouts.json"),
  vehicle: path.join(DATA_DIR, "vehicle.json"),
  oldDb: path.join(DATA_DIR, "db.json") // Kept for migration
};

const INITIAL_DATA: Record<string, any> = {
  expenses: [],
  notes: [],
  nutrition: [],
  jobs: [],
  customFoodCatalog: [],
  workouts: [],
  vehicle: {
    currentOdo: 0,
    logs: [],
    parts: [
      { id: 'p1', name: 'Oli Mesin', lastServiceDate: new Date().toISOString(), lastServiceOdo: 0, intervalKm: 2500, intervalMonths: 2, status: 'Good' },
      { id: 'p2', name: 'Oli Gardan / Transmisi', lastServiceDate: new Date().toISOString(), lastServiceOdo: 0, intervalKm: 8000, intervalMonths: 8, status: 'Good' },
      { id: 'p3', name: 'Servis Karburator & Setel Klep', lastServiceDate: new Date().toISOString(), lastServiceOdo: 0, intervalKm: 4000, status: 'Good' },
      { id: 'p4', name: 'Servis & Bersihkan CVT', lastServiceDate: new Date().toISOString(), lastServiceOdo: 0, intervalKm: 8000, status: 'Good' },
      { id: 'p5', name: 'Busi', lastServiceDate: new Date().toISOString(), lastServiceOdo: 0, intervalKm: 10000, status: 'Good' },
      { id: 'p6', name: 'Kampas Rem Depan', lastServiceDate: new Date().toISOString(), lastServiceOdo: 0, intervalKm: 12500, status: 'Good' },
      { id: 'p7', name: 'Kampas Rem Belakang', lastServiceDate: new Date().toISOString(), lastServiceOdo: 0, intervalKm: 12500, status: 'Good' },
      { id: 'p8', name: 'Filter Udara', lastServiceDate: new Date().toISOString(), lastServiceOdo: 0, intervalKm: 16000, status: 'Good' },
      { id: 'p9', name: 'Oli Shock Depan', lastServiceDate: new Date().toISOString(), lastServiceOdo: 0, intervalKm: 17500, status: 'Good' },
      { id: 'p10', name: 'V-Belt & Roller', lastServiceDate: new Date().toISOString(), lastServiceOdo: 0, intervalKm: 24000, status: 'Good' },
      { id: 'p11', name: 'Air Radiator (Coolant)', lastServiceDate: new Date().toISOString(), lastServiceOdo: 0, intervalKm: 12000, status: 'Good' }
    ]
  },
  bodyProfile: {
    gender: "male",
    height: "",
    weight: "",
    neck: "",
    waist: "",
    hip: ""
  }
};

async function ensureDataFile() {
  await Promise.all([
    fs.mkdir(DATA_DIR, { recursive: true }).catch(() => { }),
    fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(() => { })
  ]);

  // Migration: If old db.json exists, load it and save into separate files
  let migrationData: any = null;
  try {
    await fs.access(FILE_PATHS.oldDb);
    const oldDbContent = await fs.readFile(FILE_PATHS.oldDb, "utf-8");
    migrationData = JSON.parse(oldDbContent);
  } catch {
    // No db.json or parsing failed, do nothing.
  }

  // Ensure every file exists, utilizing migrated data or initialization defaults
  for (const [key, filePath] of Object.entries(FILE_PATHS)) {
    if (key === 'oldDb') continue;

    try {
      await fs.access(filePath);
    } catch {
      const dataToSave = migrationData?.[key] ?? INITIAL_DATA[key];
      await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2));
    }
  }
}

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

async function startServer() {
  await ensureDataFile();

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use('/uploads', express.static(UPLOADS_DIR));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/upload", (req, res) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err);
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: "File too large. Maximum size is 50MB." });
          }
          return res.status(400).json({ error: err.message });
        }
        return res.status(500).json({ error: "Server error during upload." });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({
        url: fileUrl,
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
      });
    });
  });

  app.get("/api/data", async (req, res) => {
    try {
      const dbResponse: Record<string, any> = {};

      // Read all separate files in parallel
      const fileReads = Object.entries(FILE_PATHS)
        .filter(([key]) => key !== 'oldDb')
        .map(async ([key, filePath]) => {
          try {
            const data = await fs.readFile(filePath, "utf-8");
            dbResponse[key] = JSON.parse(data);
          } catch {
            dbResponse[key] = INITIAL_DATA[key]; // Fail gracefully to INITIAL_DATA
          }
        });

      await Promise.all(fileReads);
      res.json(dbResponse);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to read data" });
    }
  });

  app.post("/api/data", async (req, res) => {
    try {
      const requestData = req.body;

      // Write updates to respective files in parallel
      const fileWrites = Object.entries(FILE_PATHS)
        .filter(([key]) => key !== 'oldDb')
        .map(async ([key, filePath]) => {
          if (requestData[key] !== undefined) {
            await fs.writeFile(filePath, JSON.stringify(requestData[key], null, 2));
          }
        });

      await Promise.all(fileWrites);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
