INSERT INTO teams (id, name, mascot_name, colour) VALUES
  (1, 'Foxes', 'Flick', '#FFA857'),
  (2, 'Bears', 'Bella', '#6C89FF'),
  (3, 'Otters', 'Ollie', '#75FFA5')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  mascot_name = EXCLUDED.mascot_name,
  colour = EXCLUDED.colour;
