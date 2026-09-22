// Plain-language explanations restored from V1, with biopsy-specific wording.
// Clinical reference: ACS prostate pathology guides, NCI patient PDQ, and
// https://uroweb.org/guidelines/prostatecancer/chapter/diagnostic-evaluation
export const reportExplanations = {
  gleason: {
    title: 'Gleason score',
    body: 'Describes cancer patterns seen under the microscope. The first number is the most common pattern. On a needle biopsy, a higher-grade pattern can be used for the second number even when there is little of it. That is why 3+4=7 and 4+3=7 mean different things.',
  },
  gradeGroup: {
    title: 'Grade Group (GG)',
    body: 'A scale from 1 to 5 based on the Gleason score: GG1 = 6; GG2 = 3+4; GG3 = 4+3; GG4 = 8; GG5 = 9–10. Higher groups generally indicate more aggressive-looking cancer. Grade describes appearance; stage describes its extent.',
  },
  highestGrade: {
    title: 'Highest grade in this report',
    body: 'Marks every cancer specimen with the highest Grade Group found in this report. It compares these samples only. It does not establish the stage or the person’s overall risk group.',
  },
  specimenGroups: {
    title: 'Specimen groups',
    body: 'Each original label identifies tissue submitted together from a location or target. A group may contain several needle cores. Counting groups is different from counting individual cores or tumors.',
  },
  positiveCores: {
    title: 'Positive cores',
    body: 'A core is a slender tissue sample. “1 of 2” means cancer was reported in one of two cores in this group. “Not found” means the count could not be read from the text.',
  },
  involvement: {
    title: 'Core or tissue involvement',
    body: 'The reported percentage of sampled tissue containing cancer. Reports may describe an individual core, the greatest involvement, or submitted tissue; check the source wording. This is not the percentage of the whole prostate affected.',
  },
  pattern4: {
    title: 'Gleason pattern 4',
    body: 'Pattern 4 has a more abnormal gland structure than pattern 3. In Gleason 7 cancer, the report may say how much of the cancer is pattern 4. That percentage describes the cancer’s pattern, not the whole core or prostate.',
  },
  pattern5: {
    title: 'Gleason pattern 5',
    body: 'The most abnormal Gleason pattern. Its presence is a finding to review with the clinician. A percentage, when reported, describes how much of the cancer has this pattern.',
  },
  cancerLength: {
    title: 'Cancer length',
    body: 'The measured length of cancer in the sampled tissue, in millimeters. It is another way to report the amount in a biopsy sample, not the size of a whole tumor.',
  },
  cribriform: {
    title: 'Cribriform morphology',
    body: 'A sieve-like growth pattern seen under the microscope. In prostate cancer, it can be associated with less favorable outcomes. When reported present, it is highlighted for discussion with the clinician.',
  },
  intraductal: {
    title: 'Intraductal carcinoma (IDC-P)',
    body: 'Cancer cells within existing prostate ducts. It can occur alongside more aggressive cancer and may affect care discussions. It is different from PIN.',
  },
  pni: {
    title: 'Perineural invasion',
    body: 'Cancer cells seen around or along a nerve in the sample. This finding alone does not show that cancer has spread outside the prostate.',
  },
  malignant: {
    title: 'Cancer reported',
    body: 'Cancer wording was identified in this specimen. Grade, core counts, and involvement describe different aspects of the finding. Confirm these values against the source report.',
  },
  suspicious: {
    title: 'Atypical cells / PIN',
    body: 'Abnormal or suspicious cells were described, without a definite invasive cancer diagnosis in this specimen. PIN and ASAP are different findings; the original wording tells you which was reported. Ask your clinician what follow-up is appropriate.',
  },
  benign: {
    title: 'Benign',
    body: 'The report describes this specimen as benign or explicitly reports no cancer. This describes the sampled tissue, not a guarantee about unsampled areas.',
  },
  unknown: {
    title: 'Needs wording review',
    body: 'The app could not classify this specimen from the available text. Unclear or missing wording is not a normal result; compare it with the original report.',
  },
  missing: {
    title: 'Present, not identified, or not found',
    body: '“Reported present” means the feature was explicitly mentioned. “Reported not identified” means it was explicitly described as absent. “Not found” means the app found no usable statement; it does not mean absent.',
  },
  location: {
    title: 'Specimen location',
    body: 'Right and left refer to the patient. Base is near the bladder, mid is the middle, and apex is the lower tip. Lateral is toward the outer edge; medial is toward the center. Original labels preserve the report’s exact location wording.',
  },
  confidence: {
    title: 'Text-reading confidence',
    body: 'How clearly the app recognized the location and diagnosis wording. This is not the pathologist’s confidence, a cancer probability, or a measure of severity.',
  },
  flags: {
    title: 'How the highlights work',
    body: 'Red marks reported cancer or an explicitly present pathology feature. Amber marks atypical cells or PIN. The highest-grade badge compares cancer specimens in this report. Unknown values stay neutral. These highlights help you find discussion points; they do not assign a risk group.',
  },
  schematic: {
    title: 'Map and 3D views',
    body: 'These views place complete location labels into approximate zones. They do not show a tumor’s size, shape, or spread. MRI targets and incomplete locations remain unplaced unless source coordinates are available.',
  },
} as const

export type ExplanationKey = keyof typeof reportExplanations
