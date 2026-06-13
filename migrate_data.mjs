import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ivbkqbeyimxhphiytmxj.supabase.co'
const supabaseKey = 'sb_publishable_zKPAxH9DOvilDeL7CaJVfg_tkNAGlM1'
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log("Looking for LFD Studio project...");
  const { data: projects, error: pErr } = await supabase
    .from('gantt_projects')
    .select('id, name')
    .ilike('name', '%LFD Studio%');
  
  if (pErr) {
    console.error("Error fetching projects:", pErr);
    return;
  }
  
  let projectId = null;

  if (!projects || projects.length === 0) {
    console.log("No LFD Studio project found. Creating one...");
    
    // Get user_id from an existing item
    const { data: feats } = await supabase.from('features').select('user_id').not('user_id', 'is', null).limit(1);
    if (!feats || feats.length === 0) {
      console.log("No existing features found to get user_id. Cannot create project.");
      return;
    }
    const userId = feats[0].user_id;

    // Create the project
    const { data: newProj, error: createErr } = await supabase.from('gantt_projects').insert({
      name: 'LFD Studio',
      company: 'LFD',
      start_date: new Date().toISOString().split('T')[0],
      user_id: userId
    }).select().single();

    if (createErr) {
      console.error("Failed to create project", createErr);
      return;
    }
    projectId = newProj.id;
    console.log("Created LFD Studio project with ID:", projectId);
  } else {
    projectId = projects[0].id;
    console.log("Found project ID:", projectId, "Name:", projects[0].name);
  }
  
  console.log("Updating features...");
  const { error: fErr } = await supabase.from('features').update({ project_id: projectId }).is('project_id', null);
  if (fErr) console.error("Error updating features:", fErr);
  
  console.log("Updating sprints...");
  const { error: sErr } = await supabase.from('sprints').update({ project_id: projectId }).is('project_id', null);
  if (sErr) console.error("Error updating sprints:", sErr);
  
  console.log("Updating documents...");
  const { error: dErr } = await supabase.from('documents').update({ project_id: projectId }).is('project_id', null);
  if (dErr) console.error("Error updating documents:", dErr);
  
  console.log("Migration complete! All unassigned data moved to LFD Studio project.");
}

run();
