CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    it INT UNIQUE,
    name VARCHAR(100),
    lastname VARCHAR(100),
    email VARCHAR(255),
    date DATE,
    username VARCHAR(100),
    password VARCHAR(255)
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
    id SERIAL PRIMARY KEY,
    history_id INT UNIQUE,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    topic VARCHAR(255),
    bad_pos INT,
    streak_count BOOLEAN,
    score INT,
    failure_type VARCHAR(32) CHECK (failure_type IN ('BAD_POSTURE', 'TOO_CLOSE'))
);

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
