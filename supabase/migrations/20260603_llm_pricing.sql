-- ============================================================
-- LLM Pricing Seed Migration
-- Seeds the current hardcoded MODEL_PRICING defaults into
-- app_settings (category = 'llm_pricing') so pricing is
-- editable from the admin panel without a code deploy.
-- Also seeds inr_per_usd and monthly_budget_usd for the
-- admin usage dashboard.
-- Idempotent: ON CONFLICT DO NOTHING.
-- ============================================================

INSERT INTO public.app_settings (key, value, category, label, description, is_secret) VALUES
  ('pricing:anthropic/claude-sonnet-4',  '{"in":3,"out":15}',     'llm_pricing', 'Anthropic Claude Sonnet 4 (OpenRouter)',     'USD per 1M tokens [input, output]', false),
  ('pricing:claude-sonnet-4',            '{"in":3,"out":15}',     'llm_pricing', 'Claude Sonnet 4',                            'USD per 1M tokens [input, output]', false),
  ('pricing:gpt-4o',                     '{"in":2.5,"out":10}',   'llm_pricing', 'GPT-4o',                                     'USD per 1M tokens [input, output]', false),
  ('pricing:openai/gpt-4o',              '{"in":2.5,"out":10}',   'llm_pricing', 'GPT-4o (OpenRouter)',                         'USD per 1M tokens [input, output]', false),
  ('pricing:gpt-4o-mini',                '{"in":0.15,"out":0.6}', 'llm_pricing', 'GPT-4o Mini',                                'USD per 1M tokens [input, output]', false),
  ('pricing:openai/gpt-4o-mini',         '{"in":0.15,"out":0.6}', 'llm_pricing', 'GPT-4o Mini (OpenRouter)',                    'USD per 1M tokens [input, output]', false),
  ('pricing:gemini-2.5-flash',           '{"in":0.3,"out":2.5}',  'llm_pricing', 'Gemini 2.5 Flash',                           'USD per 1M tokens [input, output]', false),
  ('pricing:google/gemini-2.5-flash',    '{"in":0.3,"out":2.5}',  'llm_pricing', 'Gemini 2.5 Flash (OpenRouter)',               'USD per 1M tokens [input, output]', false),
  ('pricing:gemini-2.5-pro',             '{"in":1.25,"out":10}',  'llm_pricing', 'Gemini 2.5 Pro',                             'USD per 1M tokens [input, output]', false),
  ('pricing:google/gemini-2.5-pro',      '{"in":1.25,"out":10}',  'llm_pricing', 'Gemini 2.5 Pro (OpenRouter)',                 'USD per 1M tokens [input, output]', false),
  ('inr_per_usd',                        '85',                    'general',     'INR per USD',                                'Exchange rate for cost display in INR', false),
  ('monthly_budget_usd',                 '',                      'general',     'Monthly AI Budget (USD)',                     'Optional: monthly budget for AI usage. Leave empty to disable the budget banner.', false)
ON CONFLICT (key) DO NOTHING;
