CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    it INT UNIQUE,
    name VARCHAR(100),
    lastname VARCHAR(100),
    email VARCHAR(255),
    date DATE,
    username VARCHAR(100),
    password VARCHAR(255),
    score INT NOT NULL DEFAULT 0
);

CREATE TABLE friends (
    id SERIAL PRIMARY KEY,
    friend_id INT UNIQUE,
    name VARCHAR(100),
    lastname VARCHAR(100),
    email VARCHAR(255),
    username VARCHAR(100)
);

CREATE TABLE history (
    session_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    topic VARCHAR(255),
    bad_pos INT DEFAULT 0,
    too_close_count INT DEFAULT 0,
    session_time_minutes INT GENERATED ALWAYS AS (
        CASE
            WHEN start_date IS NULL OR end_date IS NULL THEN NULL
            ELSE FLOOR(EXTRACT(EPOCH FROM (end_date - start_date)) / 60)::INT
        END
    ) STORED
);
CREATE INDEX IF NOT EXISTS idx_history_user_id_start_date ON history (user_id, start_date DESC);

CREATE TABLE streak (
    id SERIAL PRIMARY KEY,
    streak_id INT UNIQUE,
    strict_count INT UNIQUE,
    score INT UNIQUE
);

CREATE TABLE advice (
    id SERIAL PRIMARY KEY,
    advice_id INT UNIQUE,
    explain VARCHAR(500),
    start_date DATE,
    end_date DATE
);

CREATE TABLE leaderboard (
    username VARCHAR(100) PRIMARY KEY,
    date_register DATE,
    streak INT,
    rank INT
);

CREATE TABLE IF NOT EXISTS coach_chat_history (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    user_identifier VARCHAR(255) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    model VARCHAR(100),
    used_fallback BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coach_chat_history_user_identifier_created_at
    ON coach_chat_history (user_identifier, created_at DESC);

CREATE TABLE IF NOT EXISTS coach_weekly_recommendations (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    user_identifier VARCHAR(255) NOT NULL UNIQUE,
    recommendation TEXT NOT NULL,
    model VARCHAR(100),
    source_latest_data_at TIMESTAMP,
    generated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coach_weekly_recommendations_user_identifier
    ON coach_weekly_recommendations (user_identifier);
