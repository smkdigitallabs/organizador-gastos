-- Tabela única para armazenar dados do usuário em formato JSON
-- Isso facilita a migração do localStorage sem reescrever toda a lógica do frontend

CREATE TABLE IF NOT EXISTS user_data (
  user_id TEXT PRIMARY KEY, -- ID do usuário Clerk
  expenses JSONB DEFAULT '[]'::jsonb,
  incomes JSONB DEFAULT '[]'::jsonb,
  cards JSONB DEFAULT '[]'::jsonb,
  expense_categories JSONB DEFAULT '[]'::jsonb,
  income_categories JSONB DEFAULT '[]'::jsonb,
  achievements JSONB DEFAULT '[]'::jsonb,
  monthly_goal NUMERIC DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para busca rápida (embora PK já seja indexada)
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data(user_id);
