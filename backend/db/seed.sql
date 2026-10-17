-- sample players
INSERT INTO players (external_id, name) VALUES
  ('ext-alice',  'alice'),
  ('ext-bob',    'bob'),
  ('ext-carol',  'carol'),
  ('ext-dave',   'dave');

-- one match
INSERT INTO matches (started_at, ended_at) VALUES
  (now() - interval '30 minutes', now());

-- kills in that match (killer_id references players.id, assigned in insert order above)
INSERT INTO kills (match_id, killer_id, victim_type, exp_awarded, killed_at) VALUES
  (1, 1, 'zombie',        10, now() - interval '25 minutes'),  -- alice
  (1, 1, 'zombie',        10, now() - interval '24 minutes'),  -- alice
  (1, 1, 'goblin_archer', 25, now() - interval '23 minutes'),  -- alice
  (1, 2, 'zombie',        10, now() - interval '22 minutes'),  -- bob
  (1, 2, 'zombie',        10, now() - interval '21 minutes'),  -- bob
  (1, 4, 'goblin_archer', 25, now() - interval '20 minutes');  -- dave

-- assists: (kill_id, player_id)
INSERT INTO kill_assists (kill_id, player_id) VALUES
  (3, 2),   -- bob assisted alice's goblin kill
  (6, 3);   -- carol assisted dave's goblin kill

-- players died twice
INSERT INTO player_deaths (match_id, player_id, killed_by, died_at) VALUES
  (1, 2, 'zombie', now() - interval '26 minutes'),  -- bob died
  (1, 3, 'zombie', now() - interval '19 minutes');  -- carol died