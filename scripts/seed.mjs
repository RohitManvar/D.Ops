import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ivbkqbeyimxhphiytmxj.supabase.co',
  'sb_publishable_zKPAxH9DOvilDeL7CaJVfg_tkNAGlM1'
)

const notes = [
  {
    date: '2026-02-03',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'React Application build for VSM tool', done: true },
      { id: crypto.randomUUID(), text: 'Ongoing task A3 multiple pages implementation and A4 Improvements', done: false },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-02-04',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'React Application build for VSM tool and Design into React', done: true },
      { id: crypto.randomUUID(), text: 'Handling TailwindCSS errors and Canvas Changes', done: true },
      { id: crypto.randomUUID(), text: 'Ongoing task A3 multiple pages implementation and A4 Improvements', done: false },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-02-09',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'Ongoing React Application build and CSM plotting Improvement', done: false },
      { id: crypto.randomUUID(), text: 'Ongoing task Implementing Standard Symbols in CSM and Test Deferent Inputs', done: false },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-02-10',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'Ongoing React Application build and CSM plotting Improvement', done: false },
      { id: crypto.randomUUID(), text: 'Ongoing task Implementing Standard Symbols in CSM and Test Deferent Inputs', done: false },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-02-11',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'A3 PDF changes and Inventory Changes', done: true },
      { id: crypto.randomUUID(), text: 'Ongoing task Implementing Standard Symbols in CSM and Inventory selection in Canvas', done: false },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-02-12',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'Ladder Inventory Changes in CSM map', done: true },
      { id: crypto.randomUUID(), text: 'Meeting with Vishal sir 2:00 to 2:30', done: true },
      { id: crypto.randomUUID(), text: 'Meeting with Aakash sir 5:30 to 6:15', done: true },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-02-13',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'Created weekly timeline Gantt Chart', done: true },
      { id: crypto.randomUUID(), text: 'Create Application for VSM tool', done: true },
      { id: crypto.randomUUID(), text: 'Ongoing Task: Working on Login, Dashboard and Sequence builder pages', done: false },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-02-17',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'React Application for VSM tool', done: true },
      { id: crypto.randomUUID(), text: 'Ongoing Task: Working on Dashboard and Sequence builder pages', done: false },
      { id: crypto.randomUUID(), text: 'Working on Super Admin Side', done: true },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-02-18',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'Ongoing Task: Working on Dashboard and Sequence builder pages', done: false },
      { id: crypto.randomUUID(), text: 'ProjectSetup and Inventory Conversion into days', done: true },
      { id: crypto.randomUUID(), text: 'Working on Super Admin Side and VSM PPT review', done: true },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-02-19',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'Ongoing Task: Working on CSMCanvas and Sequence builder pages', done: false },
      { id: crypto.randomUUID(), text: 'ProjectSetup and Supplier & Customer Info', done: true },
      { id: crypto.randomUUID(), text: 'Working on Super Admin Side', done: true },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-02-20',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'ProjectSetup and Supplier & Customer Info', done: true },
      { id: crypto.randomUUID(), text: '14:00 to 14:45 meeting with Dr. Viral Kapadiya', done: true },
      { id: crypto.randomUUID(), text: 'Ongoing Task: Working on CSMCanvas, Projects and Organization pages', done: false },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-02-23',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'Ongoing Task: Working on Super Admin Panels Projects page', done: false },
      { id: crypto.randomUUID(), text: 'AllProjects.jsx and Dashboard.jsx', done: true },
      { id: crypto.randomUUID(), text: 'Working on Process Builder page', done: true },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-02-24',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'Working on Super Admin Panels Organization page', done: true },
      { id: crypto.randomUUID(), text: 'Organization.jsx and Notifications.jsx', done: true },
      { id: crypto.randomUUID(), text: 'Ongoing Task: Working on Admin Panel', done: false },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-02-25',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'Working on Admin Panels Dashboard page', done: true },
      { id: crypto.randomUUID(), text: 'Dashboard.jsx and Organization.jsx', done: true },
      { id: crypto.randomUUID(), text: 'Ongoing Task: Working on Admin Panel and Role Assign', done: false },
    ],
    blockers: '',
    tomorrow: '',
  },
  {
    date: '2026-02-26',
    project: 'VSM Automation Tool',
    summary: '',
    updates: [
      { id: crypto.randomUUID(), text: 'Working on User and Admin Panels pages', done: true },
      { id: crypto.randomUUID(), text: 'Analytics.jsx and Projects.jsx', done: true },
      { id: crypto.randomUUID(), text: 'Ongoing Task: Working on Admin Panel and User Panel', done: false },
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
  console.log('🔐 Signing in...')
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'rohitmanvar123@gmail.com',
    password: '#Rohit120',
  })
  if (error) {
    console.error('❌ Sign in failed:', error.message)
    process.exit(1)
  }
  console.log('✅ Signed in as:', data.user.email)

  const userId = data.user.id
  console.log(`\n📝 Inserting ${notes.length} daily notes...\n`)

  for (const note of notes) {
    const record = {
      user_id: userId,
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
