const mysql = require("mysql2/promise");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const mysqlConfig = {
  host: "localhost",
  user: "root",
  password: "Mysql@@3026@@",
  database: "payroll_database",
};

// ---------------- HELPERS ----------------
function normalize(v) {
  return typeof v === "string" ? v.trim() : v;
}

function toDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

async function ensureIndex(collection, keys, options = {}) {
  const indexes = await collection.indexes();
  const exists = indexes.some(
    (i) => JSON.stringify(i.key) === JSON.stringify(keys)
  );
  if (!exists) {
    await collection.createIndex(keys, options);
  }
}

// ---------------- MIGRATION ----------------
async function migrate() {
  try {
    const mysqlConn = await mysql.createConnection(mysqlConfig);
    await mongoose.connect(process.env.MONGO_URI);

    console.log("✔ Connected to MySQL");
    console.log("✔ Connected to MongoDB");

    const [tables] = await mysqlConn.query("SHOW TABLES");
    const tableKey = `Tables_in_${mysqlConfig.database}`;

    for (const row of tables) {
      const tableName = row[tableKey];
      console.log(`\n📌 Migrating ${tableName}`);

      const [rows] = await mysqlConn.query(`SELECT * FROM \`${tableName}\``);
      if (!rows.length) {
        console.log("⚠️ Empty table, skipping");
        continue;
      }

      const collection = mongoose.connection.collection(
        tableName.toLowerCase()
      );

      let inserted = 0;
      let skipped = 0;

      for (const rowData of rows) {
        try {
          const doc = { ...rowData };

          // ---- NORMALIZATION ----
          if (doc.project_id !== undefined)
            doc.project_id = String(doc.project_id);

          if (doc.worker_name) doc.worker_name = normalize(doc.worker_name);
          if (doc.profile_name) doc.profile_name = normalize(doc.profile_name);

          doc.created_at = toDate(doc.created_at);
          doc.updated_at = toDate(doc.updated_at);
          doc.original_completed_at = toDate(doc.original_completed_at);

          for (const k in doc) {
            if (
              typeof doc[k] === "string" &&
              (doc[k].startsWith("{") || doc[k].startsWith("["))
            ) {
              try {
                doc[k] = JSON.parse(doc[k]);
              } catch {}
            }
          }

          // ---- 16MB PROTECTION ----
          const size = Buffer.byteLength(JSON.stringify(doc));
          if (size > 16_000_000) {
            skipped++;
            continue;
          }

          // ---- DUPLICATE PROTECTION (KEY POINT) ----
          if (doc.project_id) {
            const exists = await collection.findOne({
              project_id: doc.project_id,
            });
            if (exists) {
              skipped++;
              continue;
            }
          }

          await collection.insertOne(doc);
          inserted++;
        } catch {
          skipped++;
        }
      }

      console.log(`✅ ${tableName}: inserted ${inserted}, skipped ${skipped}`);
    }

    // ---------------- SAFE INDEXES (NO CONFLICTS) ----------------
    await ensureIndex(
      mongoose.connection.collection("projects"),
      { project_id: 1 }
    );

    await ensureIndex(
      mongoose.connection.collection("workersalaries"),
      { project_id: 1, worker_name: 1 }
    );

    await ensureIndex(
      mongoose.connection.collection("revised_worker_salaries"),
      { project_id: 1, worker_name: 1 }
    );

    await ensureIndex(
      mongoose.connection.collection("hourlyprojectrecords"),
      { project_id: 1, worker_name: 1 }
    );

    console.log("\n🎉 Migration completed safely");

    await mysqlConn.end();
    await mongoose.disconnect();
  } catch (err) {
    console.error("❌ Migration failed:", err);
  }
}

migrate();
