
CREATE TABLE public.readings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    device_id TEXT NOT NULL,

    temperature REAL NOT NULL
        CHECK (temperature BETWEEN -40 AND 80),

    humidity REAL NOT NULL
        CHECK (humidity BETWEEN 0 AND 100),

    alert BOOLEAN GENERATED ALWAYS AS
        (temperature >= 30) STORED,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_readings_device_time
ON public.readings (device_id, created_at DESC);

ALTER TABLE public.readings
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.readings FROM anon, authenticated;

GRANT SELECT, INSERT, DELETE
ON public.readings TO service_role;

GRANT USAGE, SELECT
ON SEQUENCE public.readings_id_seq TO service_role;
