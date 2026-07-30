import sqlite3, sys

conn = sqlite3.connect('mechmate.db')
c = conn.cursor()

try:
    c.execute('''CREATE TABLE diagnoses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repair_id INTEGER NOT NULL UNIQUE,
        appointment_id INTEGER,
        customer_name VARCHAR,
        bike_model VARCHAR,
        complaint TEXT,
        inspection_notes TEXT,
        additional_symptoms TEXT,
        root_cause TEXT,
        recommended_repair TEXT,
        faulty_components TEXT,
        required_parts TEXT,
        estimated_repair_time VARCHAR,
        estimated_labor_charge FLOAT,
        repair_severity VARCHAR,
        priority VARCHAR,
        confidence_score INTEGER,
        ai_explanation TEXT,
        status VARCHAR DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')
    print('OK: diagnoses table created')
except Exception as e:
    print('SKIP diagnoses:', e)

try:
    c.execute('ALTER TABLE spare_parts ADD COLUMN reserved_quantity INTEGER DEFAULT 0')
    print('OK: reserved_quantity added to spare_parts')
except Exception as e:
    print('SKIP reserved_quantity:', e)

conn.commit()
conn.close()
print('Migration complete.')
