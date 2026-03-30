import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ivbkqbeyimxhphiytmxj.supabase.co',
  'sb_publishable_zKPAxH9DOvilDeL7CaJVfg_tkNAGlM1'
)

const notes = [
  {
    date: '2026-02-05',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'React Application build for VSM tool and Design into React', done: true },
      { id: crypto.randomUUID(), text: 'Prepare Presentation for Directors Reviews', done: true },
      { id: crypto.randomUUID(), text: '14:30 to 16:00 Presentation and Meeting with Directors', done: true },
      { id: crypto.randomUUID(), text: 'CSM plotting changes in React App', done: true },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-02-06',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'React Application build for VSM tool and Design into React', done: true },
      { id: crypto.randomUUID(), text: 'Implementing Standard Symbols in CSM', done: true },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-03-03',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'Working on Analytics page', done: true },
      { id: crypto.randomUUID(), text: 'Projects.jsx and Setting.jsx', done: true },
      { id: crypto.randomUUID(), text: 'Ongoing Task: Working on User Panel', done: false },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-03-05',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'Working on CSMCanvas to improve Design', done: true },
      { id: crypto.randomUUID(), text: 'ProcessBuilder changes Dynamic box', done: true },
      { id: crypto.randomUUID(), text: 'Ongoing Task: All the Panels', done: false },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-03-06',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'Working on FSMCanvas Design', done: true },
      { id: crypto.randomUUID(), text: 'FSMBuilder.jsx and FSMCanvas.jsx', done: true },
      { id: crypto.randomUUID(), text: 'Ongoing Task: Implementation of FSM', done: false },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-03-09',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'Working on FSMCanvas Design', done: true },
      { id: crypto.randomUUID(), text: 'Analyticsreport.jsx and FSMCanvas.jsx', done: true },
      { id: crypto.randomUUID(), text: 'Ongoing Task: Implementation of FSM', done: false },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-03-10',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'Working on Database Design', done: true },
      { id: crypto.randomUUID(), text: 'Analyticsreport.jsx and learn about schemas', done: true },
      { id: crypto.randomUUID(), text: 'Ongoing Task: Implementation of FSM and Database', done: false },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-03-11',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'Working on Database Design', done: true },
      { id: crypto.randomUUID(), text: 'Analyticsreport.jsx and Loading animations', done: true },
      { id: crypto.randomUUID(), text: 'Ongoing Task: Implementation of FSM and Database', done: false },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-03-13',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'Working on Database Design (3NF)', done: true },
      { id: crypto.randomUUID(), text: 'Analyticsreport.jsx with filters', done: true },
      { id: crypto.randomUUID(), text: 'Ongoing Task: Implementation of Backend FastAPI', done: false },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-03-16',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'Database Connectivity With Backend and Creating APIs', done: true },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-03-17',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'FastAPI and Creating Deferent API for Calling', done: true },
      { id: crypto.randomUUID(), text: 'Database Design reference from YouTube', done: true },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-03-18',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'FastAPI and Creating Deferent API for Calling', done: true },
      { id: crypto.randomUUID(), text: 'Plan for Improvement Card on FSM', done: true },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-03-19',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'FastAPI and Creating Deferent API for Calling', done: true },
      { id: crypto.randomUUID(), text: 'Implementation of Improvement Card on FSM (New feature)', done: true },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-03-23',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'Ongoing task: FastAPI and Creating Deferent API for Calling', done: false },
      { id: crypto.randomUUID(), text: 'Implementation of Improvement Card on FSM (New feature)', done: true },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-03-24',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'Meeting with Aakash Sir 14:30 to 15:00', done: true },
      { id: crypto.randomUUID(), text: 'Ongoing task: implementation of Improvement Card on FSM (New feature)', done: false },
      { id: crypto.randomUUID(), text: 'Meeting with Samip 18:45 to 19:30', done: true },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-03-25',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'Working on Dynamic Excel Upload', done: true },
      { id: crypto.randomUUID(), text: 'Ongoing task: implementation of Improvement Card on FSM', done: false },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-03-26',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'Ongoing task: Working on Dynamic Excel Upload', done: false },
      { id: crypto.randomUUID(), text: 'Made changes for Pilot testing in Process Builder page', done: true },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-03-27',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'Ongoing task: Working on Dynamic Excel Upload', done: false },
      { id: crypto.randomUUID(), text: 'Made changes for Pilot testing in Process Builder page and Auto save function', done: true },
    ],
    blockers: '',
    tomorrow: '',
  },
]

function buildWhatsappMessage(note) {
  const completed = note.updates
    .filter((u) => u.text.trim())
    .map((u) => `• ${u.text.trim()}`)
    .join('\n')

  const lines = [
    `Daily Update – ${note.date}`,
    `Project: ${note.project || 'Project'}`,
    '',
    'Work done:',
    completed || '• No updates added yet',
  ]

  if (note.blockers.trim()) lines.push('', `Blockers: ${note.blockers.trim()}`)
  if (note.tomorrow.trim()) lines.push('', `Next: ${note.tomorrow.trim()}`)

  return lines.join('\n')
}

async function seed() {
  console.log('🔐 Signing up user...')
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: 'rohitmanvar123@gmail.com',
    password: '#Rohit120',
  })

  if (signUpError) {
    console.log('Sign up failed, trying sign in...', signUpError.message)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'rohitmanvar123@gmail.com',
      password: '#Rohit120',
    })
    if (signInError) {
      console.error('❌ Sign in also failed:', signInError.message)
      process.exit(1)
    }
    console.log('✅ Signed in as:', signInData.user.email)
  } else {
    console.log('✅ User created:', signUpData.user?.email)
    // Try to sign in immediately (in case email confirmation is disabled)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'rohitmanvar123@gmail.com',
      password: '#Rohit120',
    })
    if (signInError) {
      console.log('⚠️  Email confirmation may be required. Check your email and then re-run this script.')
      process.exit(1)
    }
    console.log('✅ Signed in as:', signInData.user.email)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('❌ No authenticated user found')
    process.exit(1)
  }

  console.log(`\n📝 Inserting ${notes.length} daily notes for user ${user.id}...\n`)

  for (const note of notes) {
    const record = {
      user_id: user.id,
      date: note.date,
      project: note.project,
      summary: note.summary,
      updates: note.updates,
      blockers: note.blockers,
      tomorrow: note.tomorrow,
      whatsapp_message: buildWhatsappMessage(note),
    }

    const { error } = await supabase.from('notes').insert(record)

    if (error) {
      console.error(`  ❌ ${note.date}: ${error.message}`)
    } else {
      console.log(`  ✅ ${note.date}: ${note.updates.length} updates added`)
    }
  }

  console.log('\n🎉 Seeding complete!')
  process.exit(0)
}

seed()
