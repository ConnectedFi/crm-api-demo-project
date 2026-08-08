import { useServerFn } from "@tanstack/react-start"
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react"
import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  getApplicationReferenceData,
  organizationTypes,
  submitNewApplication,
} from "./origination.functions"
import type {
  ApplicationSubmissionFailure,
  SubmissionInput,
} from "./origination.functions"

type ExistingPersonDraft = {
  id: string
  mode: "existing"
  email: string
  personUuid: string | null
  resolvedName: string | null
  lookupMessage: string | null
}

type NewPersonDraft = {
  id: string
  mode: "new"
  firstName: string
  lastName: string
  email: string
  phone: string
  communicationPreference: "" | "Phone" | "Text" | "Email"
  birthDate: string
  maritalStatus: "" | "Married" | "Single" | "Divorced" | "Separated"
  govId: string
  yearsFarming: string
  sharePercentage: string
  totalAssets: string
  totalLiabilities: string
  grossFarmIncome: string
  nonFarmIncome: string
  street: string
  city: string
  state: string
  zip: string
}

type PersonDraft = ExistingPersonDraft | NewPersonDraft

type ReferenceData = Awaited<ReturnType<typeof getApplicationReferenceData>>
type PersonReferenceOption = ReferenceData["people"][number]
type OrganizationReferenceOption = ReferenceData["organizations"][number]

type OrganizationDraft =
  | { mode: "none" }
  | {
      mode: "existing"
      fein: string
      organizationUuid: string | null
      resolvedName: string | null
      lookupMessage: string | null
    }
  | {
      mode: "new"
      name: string
      fein: string
      type: (typeof organizationTypes)[number]
      incorporatedDate: string
      totalAssets: string
      totalLiabilities: string
      grossFarmIncome: string
      nonFarmIncome: string
      street: string
      city: string
      state: string
      zip: string
    }

const inputClass =
  "h-9 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#36734e] focus:ring-2 focus:ring-[#36734e]/10"
const labelClass = "grid gap-1.5 text-xs font-medium text-black/65"

function createExistingPerson(
  id: string = crypto.randomUUID()
): ExistingPersonDraft {
  return {
    id,
    mode: "existing",
    email: "",
    personUuid: null,
    resolvedName: null,
    lookupMessage: null,
  }
}

function createNewPerson(id: string = crypto.randomUUID()): NewPersonDraft {
  return {
    id,
    mode: "new",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    communicationPreference: "",
    birthDate: "",
    maritalStatus: "",
    govId: "",
    yearsFarming: "",
    sharePercentage: "100",
    totalAssets: "",
    totalLiabilities: "",
    grossFarmIncome: "0",
    nonFarmIncome: "0",
    street: "",
    city: "",
    state: "",
    zip: "",
  }
}

function filterPeople(people: Array<PersonReferenceOption>, query: string) {
  const needle = normalizeSearch(query)
  return people
    .filter((person) =>
      normalizeSearch(
        [
          person.firstName,
          person.lastName,
          person.email,
          person.phone,
          person.city,
          person.state,
        ].join(" ")
      ).includes(needle)
    )
    .slice(0, 8)
}

function filterOrganizations(
  organizations: Array<OrganizationReferenceOption>,
  query: string
) {
  const needle = normalizeSearch(query)
  return organizations
    .filter((organization) =>
      normalizeSearch(
        [
          organization.name,
          organization.registrationNumber,
          organization.type,
          organization.city,
          organization.state,
        ].join(" ")
      ).includes(needle)
    )
    .slice(0, 8)
}

function normalizeSearch(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]/g, "")
}

function formatLocation(city: string, state: string) {
  return [city, state].filter(Boolean).join(", ")
}

function ReferenceResults({
  children,
  emptyLabel,
  showEmpty,
}: {
  children: Array<ReactNode>
  emptyLabel: string
  showEmpty: boolean
}) {
  if (children.length > 0) {
    return (
      <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-black/10 bg-white p-1 shadow-sm">
        {children}
      </div>
    )
  }
  return showEmpty ? (
    <p className="mt-3 text-sm text-black/45">{emptyLabel}</p>
  ) : null
}

function ReferenceResultButton({
  title,
  subtitle,
  onClick,
}: {
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-md px-3 py-2 text-left transition hover:bg-[#edf3ed] focus:bg-[#edf3ed] focus:outline-none"
    >
      <span className="block text-sm font-medium text-black/85">{title}</span>
      <span className="mt-0.5 block truncate text-xs text-black/45">
        {subtitle}
      </span>
    </button>
  )
}

export function NewApplicationForm({
  onSubmitted,
  onBack,
  initialApplicant,
  initialNewApplicant,
  initialAmountDollars = "",
}: {
  onSubmitted: (result: {
    financingUuid: string
    personUuid: string
    replayed: boolean
  }) => Promise<void>
  onBack: () => void
  initialApplicant?: {
    personUuid: string
    firstName: string
    lastName: string
    email: string
  }
  initialNewApplicant?: {
    firstName: string
    lastName: string
    email: string
  }
  initialAmountDollars?: string
}) {
  const loadReferenceData = useServerFn(getApplicationReferenceData)
  const submit = useServerFn(submitNewApplication)
  const [step, setStep] = useState(0)
  const [mainApplicant, setMainApplicant] = useState<PersonDraft>(() =>
    initialApplicant
      ? {
          ...createExistingPerson("main-applicant"),
          email: initialApplicant.email,
          personUuid: initialApplicant.personUuid,
          resolvedName:
            `${initialApplicant.firstName} ${initialApplicant.lastName}`.trim(),
        }
      : initialNewApplicant
        ? {
            ...createNewPerson("main-applicant"),
            firstName: initialNewApplicant.firstName,
            lastName: initialNewApplicant.lastName,
            email: initialNewApplicant.email,
          }
        : createExistingPerson("main-applicant")
  )
  const [coApplicants, setCoApplicants] = useState<Array<PersonDraft>>([])
  const [organization, setOrganization] = useState<OrganizationDraft>({
    mode: "none",
  })
  const [amountDollars, setAmountDollars] = useState(initialAmountDollars)
  const [farmState, setFarmState] = useState("")
  const [numberOfAcres, setNumberOfAcres] = useState("")
  const [expectedRevenueDollars, setExpectedRevenueDollars] = useState("")
  const [referenceData, setReferenceData] = useState<ReferenceData>({
    people: [],
    organizations: [],
  })
  const [isLoadingReferences, setIsLoadingReferences] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submissionFailure, setSubmissionFailure] =
    useState<ApplicationSubmissionFailure | null>(null)
  const [validationAttempted, setValidationAttempted] = useState(false)
  const [submissionUuid] = useState(() => crypto.randomUUID())
  const stepValidationErrors =
    step < 2
      ? getStepValidationErrors(step, mainApplicant, coApplicants, organization)
      : getFinancingValidationErrors(
          amountDollars,
          farmState,
          numberOfAcres,
          expectedRevenueDollars
        )

  useEffect(() => {
    let cancelled = false
    setIsLoadingReferences(true)
    loadReferenceData()
      .then((result) => {
        if (!cancelled) setReferenceData(result)
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            errorMessage(loadError, "Could not load the local CFI directory.")
          )
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingReferences(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadReferenceData])

  function updateApplicant(id: string, next: PersonDraft) {
    if (id === mainApplicant.id) {
      setMainApplicant(next)
      return
    }

    setCoApplicants((current) =>
      current.map((person) => (person.id === id ? next : person))
    )
  }

  async function handleSubmit() {
    setError(null)
    setSubmissionFailure(null)
    setIsSubmitting(true)
    try {
      const data = buildSubmission({
        submissionUuid,
        mainApplicant,
        coApplicants,
        organization,
        amountDollars,
        farmState,
        numberOfAcres,
        expectedRevenueDollars,
      })
      const result = await submit({ data })
      if (!result.ok) {
        setSubmissionFailure(result)
        return
      }
      await onSubmitted(result)
    } catch (submitError) {
      setError(errorMessage(submitError, "Application submission failed."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-black/8 bg-[#f7f8f5]">
      <header className="border-b border-black/8 bg-white px-5 py-4">
        <h2 className="text-lg font-semibold tracking-[-0.02em]">
          New financing application
        </h2>
        <p className="mt-1 text-sm text-black/50">
          Create or link CFI records, then submit the application.
        </p>
      </header>

      <div className="border-b border-black/8 bg-white px-5 py-3">
        <ol className="flex items-center gap-2 text-xs font-medium">
          {[
            ["1", "People"],
            ["2", "Organization"],
            ["3", "Financing"],
          ].map(([number, label], index) => {
            const complete = isStepComplete(
              index,
              mainApplicant,
              coApplicants,
              organization,
              amountDollars,
              farmState,
              numberOfAcres,
              expectedRevenueDollars
            )

            return (
              <li key={label} className="flex items-center gap-2">
                <button
                  type="button"
                  aria-current={index === step ? "step" : undefined}
                  onClick={() => {
                    setError(null)
                    setSubmissionFailure(null)
                    setValidationAttempted(false)
                    setStep(index)
                  }}
                  className={`flex items-center gap-2 rounded-lg px-1.5 py-1 transition hover:bg-black/[0.04] ${index === step ? "text-[#285b3d]" : "text-black/45 hover:text-black/70"}`}
                >
                  <span
                    className={`grid size-6 place-items-center rounded-full ${index === step ? "bg-[#dfece2]" : complete ? "bg-[#285b3d] text-white" : "bg-black/5"}`}
                  >
                    {complete && index !== step ? (
                      <Check className="size-3.5" />
                    ) : (
                      number
                    )}
                  </span>
                  {label}
                </button>
                {index < 2 ? (
                  <span className="mx-1 h-px w-8 bg-black/10 sm:w-16" />
                ) : null}
              </li>
            )
          })}
        </ol>
      </div>

      <div className="p-5">
        {step === 0 ? (
          <PeopleStep
            mainApplicant={mainApplicant}
            coApplicants={coApplicants}
            people={referenceData.people}
            isLoading={isLoadingReferences}
            onChange={updateApplicant}
            onRemove={(id) =>
              setCoApplicants((current) =>
                current.filter((person) => person.id !== id)
              )
            }
            onAdd={() =>
              setCoApplicants((current) => [...current, createExistingPerson()])
            }
          />
        ) : null}
        {step === 1 ? (
          <OrganizationStep
            organization={organization}
            organizations={referenceData.organizations}
            isLoading={isLoadingReferences}
            onChange={setOrganization}
          />
        ) : null}
        {step === 2 ? (
          <FinancingStep
            mainApplicant={mainApplicant}
            coApplicants={coApplicants}
            organization={organization}
            amountDollars={amountDollars}
            farmState={farmState}
            numberOfAcres={numberOfAcres}
            expectedRevenueDollars={expectedRevenueDollars}
            onAmountChange={setAmountDollars}
            onFarmStateChange={setFarmState}
            onAcresChange={setNumberOfAcres}
            onRevenueChange={setExpectedRevenueDollars}
          />
        ) : null}

        {submissionFailure ? (
          <ApplicationSubmissionErrors
            failure={submissionFailure}
            mainApplicant={mainApplicant}
            coApplicants={coApplicants}
            organization={organization}
          />
        ) : null}

        {error ? (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm break-words text-red-900">
            {error}
          </div>
        ) : null}
        {validationAttempted && stepValidationErrors.length > 0 ? (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          >
            <p className="font-medium">
              Complete these details before continuing:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5">
              {stepValidationErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <footer className="flex items-center justify-between border-t border-black/8 bg-white px-5 py-4">
        <Button
          variant="ghost"
          disabled={isSubmitting}
          onClick={() => {
            setError(null)
            setSubmissionFailure(null)
            setValidationAttempted(false)
            if (step === 0) onBack()
            else setStep((current) => current - 1)
          }}
        >
          <ChevronLeft /> {step === 0 ? "Payment" : "Back"}
        </Button>
        {step < 2 ? (
          <Button
            disabled={isSubmitting}
            onClick={() => {
              setError(null)
              if (stepValidationErrors.length > 0) {
                setValidationAttempted(true)
              } else {
                setValidationAttempted(false)
                setStep((current) => current + 1)
              }
            }}
          >
            {step === 0 ? "Continue to organization" : "Continue to financing"}{" "}
            <ChevronRight />
          </Button>
        ) : (
          <Button
            disabled={isSubmitting}
            onClick={() => {
              if (stepValidationErrors.length > 0) {
                setValidationAttempted(true)
              } else {
                setValidationAttempted(false)
                void handleSubmit()
              }
            }}
          >
            {isSubmitting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Check />
            )}
            {isSubmitting
              ? "Creating application…"
              : "Create & submit application"}
          </Button>
        )}
      </footer>
    </section>
  )
}

function PeopleStep({
  mainApplicant,
  coApplicants,
  people,
  isLoading,
  onChange,
  onRemove,
  onAdd,
}: {
  mainApplicant: PersonDraft
  coApplicants: Array<PersonDraft>
  people: Array<PersonReferenceOption>
  isLoading: boolean
  onChange: (id: string, person: PersonDraft) => void
  onRemove: (id: string) => void
  onAdd: () => void
}) {
  return (
    <section>
      <div>
        <h3 className="font-semibold">Main applicant</h3>
        <p className="mt-1 text-sm text-black/50">
          This applicant owns the financing request and is always sent first to
          CFI.
        </p>
      </div>

      <div className="mt-5">
        <ApplicantEditor
          person={mainApplicant}
          label="Main applicant"
          people={people}
          isLoading={isLoading}
          onChange={(next) => onChange(mainApplicant.id, next)}
        />
      </div>

      <div className="mt-7 flex items-start justify-between gap-4 border-t border-black/8 pt-6">
        <div>
          <h3 className="font-semibold">Co-applicants</h3>
          <p className="mt-1 text-sm text-black/50">
            Optional additional applicants on the same financing request.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus /> Add co-applicant
        </Button>
      </div>

      <div className="mt-5 grid gap-4">
        {coApplicants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/15 bg-white/60 p-6 text-center text-sm text-black/45">
            No co-applicants added.
          </div>
        ) : null}
        {coApplicants.map((person, index) => (
          <ApplicantEditor
            key={person.id}
            person={person}
            label={`Co-applicant ${index + 1}`}
            people={people}
            isLoading={isLoading}
            onChange={(next) => onChange(person.id, next)}
            onRemove={() => onRemove(person.id)}
          />
        ))}
      </div>
    </section>
  )
}

function ApplicantEditor({
  person,
  label,
  people,
  isLoading,
  onChange,
  onRemove,
}: {
  person: PersonDraft
  label: string
  people: Array<PersonReferenceOption>
  isLoading: boolean
  onChange: (person: PersonDraft) => void
  onRemove?: () => void
}) {
  const matches =
    person.mode === "existing"
      ? filterPeople(people, person.email).filter(
          (candidate) => candidate.personUuid !== person.personUuid
        )
      : []

  return (
    <div className="rounded-xl border border-black/8 bg-white p-4 shadow-[0_4px_16px_rgba(17,38,24,0.03)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-[#edf3ed] text-[#285b3d]">
            <UserRound className="size-3.5" />
          </span>
          <p className="text-sm font-medium">{label}</p>
        </div>
        {onRemove ? (
          <button
            type="button"
            aria-label={`Remove ${label.toLowerCase()}`}
            onClick={onRemove}
            className="grid size-8 place-items-center rounded-lg text-black/35 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex gap-2">
        <ModeButton
          active={person.mode === "existing"}
          onClick={() => onChange(createExistingPerson(person.id))}
        >
          Existing CFI person
        </ModeButton>
        <ModeButton
          active={person.mode === "new"}
          onClick={() => onChange(createNewPerson(person.id))}
        >
          Enter new person
        </ModeButton>
      </div>

      {person.mode === "existing" ? (
        <div className="mt-4">
          <label className={labelClass}>
            Search synced CFI people
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-black/35" />
              <input
                type="search"
                value={person.email}
                onChange={(event) =>
                  onChange({
                    ...person,
                    email: event.target.value,
                    personUuid: null,
                    resolvedName: null,
                    lookupMessage: null,
                  })
                }
                placeholder="Search by name, email, or location"
                className={`${inputClass} pl-9`}
              />
            </div>
          </label>
          {isLoading ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-black/45">
              <LoaderCircle className="size-4 animate-spin" /> Loading synced
              people…
            </p>
          ) : null}
          {!isLoading && !person.personUuid ? (
            <ReferenceResults
              emptyLabel={
                people.length === 0
                  ? "No people are synced locally yet. Run an import, or enter a new person."
                  : "No synced people match that search."
              }
              showEmpty={person.email.trim().length > 0 || people.length === 0}
            >
              {matches.map((candidate) => (
                <ReferenceResultButton
                  key={candidate.personUuid}
                  title={`${candidate.firstName} ${candidate.lastName}`.trim()}
                  subtitle={[
                    candidate.email,
                    formatLocation(candidate.city, candidate.state),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  onClick={() =>
                    onChange({
                      ...person,
                      email: candidate.email,
                      personUuid: candidate.personUuid,
                      resolvedName:
                        `${candidate.firstName} ${candidate.lastName}`.trim(),
                      lookupMessage: null,
                    })
                  }
                />
              ))}
            </ReferenceResults>
          ) : null}
          {person.resolvedName ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              <span className="flex items-center gap-2">
                <Check className="size-4" /> {person.resolvedName}
              </span>
              <button
                type="button"
                className="text-xs underline"
                onClick={() => onChange(createExistingPerson(person.id))}
              >
                Change
              </button>
            </div>
          ) : null}
          {person.lookupMessage ? (
            <p className="mt-3 text-sm text-amber-800">
              {person.lookupMessage} Switch to “Enter new person” if
              appropriate.
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <p className="mt-3 text-xs text-black/50">
            This person will be created in CFI when you create and submit the
            application. Nothing is saved separately on this step.
          </p>
          <NewPersonFields person={person} onChange={onChange} />
        </>
      )}
    </div>
  )
}

function NewPersonFields({
  person,
  onChange,
}: {
  person: NewPersonDraft
  onChange: (person: NewPersonDraft) => void
}) {
  const set = (field: keyof NewPersonDraft, value: string) =>
    onChange({ ...person, [field]: value })

  return (
    <div className="mt-4 grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="First name"
          value={person.firstName}
          onChange={(v) => set("firstName", v)}
        />
        <Field
          label="Last name"
          value={person.lastName}
          onChange={(v) => set("lastName", v)}
        />
        <Field
          label="Email"
          type="email"
          value={person.email}
          onChange={(v) => set("email", v)}
        />
        <Field
          label="Phone"
          type="tel"
          value={person.phone}
          onChange={(v) => set("phone", v)}
        />
        <label className={labelClass}>
          Communication preference
          <select
            value={person.communicationPreference}
            onChange={(event) =>
              set("communicationPreference", event.target.value)
            }
            className={inputClass}
          >
            <option value="">Select a preference</option>
            <option value="Phone">Phone</option>
            <option value="Text">Text</option>
            <option value="Email">Email</option>
          </select>
        </label>
        <Field
          label="Date of birth"
          type="date"
          value={person.birthDate}
          onChange={(v) => set("birthDate", v)}
        />
        <label className={labelClass}>
          Marital status
          <select
            value={person.maritalStatus}
            onChange={(event) => set("maritalStatus", event.target.value)}
            className={inputClass}
          >
            <option value="">Select a status</option>
            <option value="Married">Married</option>
            <option value="Single">Single</option>
            <option value="Divorced">Divorced</option>
            <option value="Separated">Separated</option>
          </select>
        </label>
        <Field
          label="Government ID (9 digits)"
          inputMode="numeric"
          value={person.govId}
          onChange={(v) => set("govId", v)}
        />
        <Field
          label="Years farming"
          type="number"
          min="1"
          max="99"
          value={person.yearsFarming}
          onChange={(v) => set("yearsFarming", v)}
        />
        <Field
          label="Ownership share (%)"
          type="number"
          min="1"
          max="100"
          value={person.sharePercentage}
          onChange={(v) => set("sharePercentage", v)}
        />
      </div>
      <FinancialFields value={person} onChange={set} />
      <AddressFields value={person} onChange={set} />
    </div>
  )
}

function OrganizationStep({
  organization,
  organizations,
  isLoading,
  onChange,
}: {
  organization: OrganizationDraft
  organizations: Array<OrganizationReferenceOption>
  isLoading: boolean
  onChange: (organization: OrganizationDraft) => void
}) {
  const matches =
    organization.mode === "existing"
      ? filterOrganizations(organizations, organization.fein).filter(
          (candidate) =>
            candidate.organizationUuid !== organization.organizationUuid
        )
      : []

  return (
    <section>
      <div>
        <h3 className="font-semibold">Organization</h3>
        <p className="mt-1 text-sm text-black/50">
          Link an existing organization, create one, or submit without one.
        </p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <ModeButton
          active={organization.mode === "none"}
          onClick={() => onChange({ mode: "none" })}
        >
          No organization
        </ModeButton>
        <ModeButton
          active={organization.mode === "existing"}
          onClick={() =>
            onChange({
              mode: "existing",
              fein: "",
              organizationUuid: null,
              resolvedName: null,
              lookupMessage: null,
            })
          }
        >
          Existing organization
        </ModeButton>
        <ModeButton
          active={organization.mode === "new"}
          onClick={() => onChange(createNewOrganization())}
        >
          Create organization
        </ModeButton>
      </div>

      {organization.mode === "none" ? (
        <div className="mt-6 rounded-xl border border-dashed border-black/15 bg-white/70 p-8 text-center text-sm text-black/45">
          This application will be submitted with organization set to null.
        </div>
      ) : null}

      {organization.mode === "existing" ? (
        <div className="mt-6 rounded-xl border border-black/8 bg-white p-4">
          <label className={labelClass}>
            Search synced CFI organizations
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-black/35" />
              <input
                type="search"
                value={organization.fein}
                onChange={(event) =>
                  onChange({
                    ...organization,
                    fein: event.target.value,
                    organizationUuid: null,
                    resolvedName: null,
                    lookupMessage: null,
                  })
                }
                placeholder="Search by organization name, EIN, or location"
                className={`${inputClass} pl-9`}
              />
            </div>
          </label>
          {isLoading ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-black/45">
              <LoaderCircle className="size-4 animate-spin" /> Loading synced
              organizations…
            </p>
          ) : null}
          {!isLoading && !organization.organizationUuid ? (
            <ReferenceResults
              emptyLabel={
                organizations.length === 0
                  ? "No organizations are synced locally yet. Run an import, or create one here."
                  : "No synced organizations match that search."
              }
              showEmpty={
                organization.fein.trim().length > 0 ||
                organizations.length === 0
              }
            >
              {matches.map((candidate) => (
                <ReferenceResultButton
                  key={candidate.organizationUuid}
                  title={candidate.name}
                  subtitle={[
                    candidate.registrationNumber,
                    candidate.type
                      ? organizationTypeLabel(candidate.type)
                      : null,
                    formatLocation(candidate.city ?? "", candidate.state ?? ""),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  onClick={() =>
                    onChange({
                      ...organization,
                      fein: candidate.registrationNumber ?? "",
                      organizationUuid: candidate.organizationUuid,
                      resolvedName: candidate.name,
                      lookupMessage: null,
                    })
                  }
                />
              ))}
            </ReferenceResults>
          ) : null}
          {organization.resolvedName ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              <span className="flex items-center gap-2">
                <Check className="size-4" /> {organization.resolvedName}
              </span>
              <button
                type="button"
                className="text-xs underline"
                onClick={() =>
                  onChange({
                    mode: "existing",
                    fein: "",
                    organizationUuid: null,
                    resolvedName: null,
                    lookupMessage: null,
                  })
                }
              >
                Change
              </button>
            </div>
          ) : null}
          {organization.lookupMessage ? (
            <p className="mt-3 text-sm text-amber-800">
              {organization.lookupMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      {organization.mode === "new" ? (
        <NewOrganizationFields
          organization={organization}
          onChange={onChange}
        />
      ) : null}
    </section>
  )
}

function NewOrganizationFields({
  organization,
  onChange,
}: {
  organization: Extract<OrganizationDraft, { mode: "new" }>
  onChange: (organization: OrganizationDraft) => void
}) {
  const set = (field: keyof typeof organization, value: string) =>
    onChange({ ...organization, [field]: value })
  return (
    <div className="mt-6 grid gap-4 rounded-xl border border-black/8 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Legal name"
          value={organization.name}
          onChange={(v) => set("name", v)}
        />
        <Field
          label="FEIN / EIN"
          value={organization.fein}
          placeholder="12-3456789"
          onChange={(v) => set("fein", v)}
        />
        <label className={labelClass}>
          Organization type
          <select
            value={organization.type}
            onChange={(event) => set("type", event.target.value)}
            className={inputClass}
          >
            {organizationTypes.map((type) => (
              <option key={type} value={type}>
                {organizationTypeLabel(type)}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Incorporated date"
          type="date"
          value={organization.incorporatedDate}
          onChange={(v) => set("incorporatedDate", v)}
        />
      </div>
      <FinancialFields value={organization} onChange={set} />
      <AddressFields value={organization} onChange={set} />
    </div>
  )
}

function FinancingStep({
  mainApplicant,
  coApplicants,
  organization,
  amountDollars,
  farmState,
  numberOfAcres,
  expectedRevenueDollars,
  onAmountChange,
  onFarmStateChange,
  onAcresChange,
  onRevenueChange,
}: {
  mainApplicant: PersonDraft
  coApplicants: Array<PersonDraft>
  organization: OrganizationDraft
  amountDollars: string
  farmState: string
  numberOfAcres: string
  expectedRevenueDollars: string
  onAmountChange: (value: string) => void
  onFarmStateChange: (value: string) => void
  onAcresChange: (value: string) => void
  onRevenueChange: (value: string) => void
}) {
  return (
    <section>
      <h3 className="font-semibold">Financing request</h3>
      <p className="mt-1 text-sm text-black/50">
        Enter the requested amount and optional farm information, then review
        the linked parties.
      </p>
      <div className="mt-5 grid gap-4 rounded-xl border border-black/8 bg-white p-4 sm:grid-cols-2">
        <Field
          label="Requested amount (USD)"
          type="number"
          min="0.01"
          step="0.01"
          value={amountDollars}
          placeholder="60000.00"
          onChange={onAmountChange}
        />
        <Field
          label="Expected farm revenue (USD, optional)"
          type="number"
          min="0"
          step="0.01"
          value={expectedRevenueDollars}
          onChange={onRevenueChange}
        />
        <Field
          label="Primary farm state (optional)"
          maxLength={2}
          value={farmState}
          placeholder="IA"
          onChange={(value) => onFarmStateChange(value.toUpperCase())}
        />
        <Field
          label="Number of acres (optional)"
          type="number"
          min="0"
          step="1"
          value={numberOfAcres}
          onChange={onAcresChange}
        />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ReviewCard
          icon={<UserRound className="size-4" />}
          title="Main applicant"
          body={personName(mainApplicant)}
        />
        <ReviewCard
          icon={<UserRound className="size-4" />}
          title={`${coApplicants.length} ${coApplicants.length === 1 ? "co-applicant" : "co-applicants"}`}
          body={
            coApplicants.length === 0
              ? "None"
              : coApplicants.map(personName).join(", ")
          }
        />
        <ReviewCard
          icon={<Building2 className="size-4" />}
          title="Organization"
          body={organizationName(organization)}
        />
      </div>
    </section>
  )
}

function ApplicationSubmissionErrors({
  failure,
  mainApplicant,
  coApplicants,
  organization,
}: {
  failure: ApplicationSubmissionFailure
  mainApplicant: PersonDraft
  coApplicants: Array<PersonDraft>
  organization: OrganizationDraft
}) {
  const people = [mainApplicant, ...coApplicants]

  function entityLabel(
    entity: ApplicationSubmissionFailure["entities"][number]
  ) {
    if (entity.kind === "person") {
      const person = people.find(
        (candidate) =>
          candidate.mode === "existing" && candidate.personUuid === entity.ref
      )
      return person ? personName(person) : "Applicant"
    }
    if (entity.kind === "organization") {
      const matchesSelectedOrganization =
        organization.mode === "existing" &&
        organization.organizationUuid === entity.ref
      return matchesSelectedOrganization
        ? organizationName(organization)
        : "Organization"
    }
    return "Financing application"
  }

  return (
    <div
      role="alert"
      className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-950"
    >
      <div className="flex items-start gap-3">
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-red-700" />
        <div className="min-w-0">
          <p className="font-semibold">CFI needs more information</p>
          <p className="mt-1 text-xs leading-5 text-red-900/75">
            Correct the details below before submitting this application again.
          </p>
          <div className="mt-3 space-y-3">
            {failure.entities.map((entity) => (
              <div key={`${entity.kind}-${entity.ref}`}>
                <p className="font-medium">{entityLabel(entity)}</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-xs leading-5">
                  {entity.errors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {!failure.retriable ? (
            <p className="mt-3 text-xs leading-5 text-red-900/75">
              Retrying without correcting these records will return the same
              result.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function FinancialFields<T extends Record<string, string>>({
  value,
  onChange,
}: {
  value: T
  onChange: (field: keyof T, value: string) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold text-black/45">
        Financials — whole USD dollars
      </legend>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label="Total assets"
          type="number"
          min="1"
          step="1"
          value={value.totalAssets}
          onChange={(v) => onChange("totalAssets", v)}
        />
        <Field
          label="Total liabilities"
          type="number"
          min="1"
          step="1"
          value={value.totalLiabilities}
          onChange={(v) => onChange("totalLiabilities", v)}
        />
        <Field
          label="Gross farm income"
          type="number"
          min="0"
          step="1"
          value={value.grossFarmIncome}
          onChange={(v) => onChange("grossFarmIncome", v)}
        />
        <Field
          label="Non-farm income"
          type="number"
          min="0"
          step="1"
          value={value.nonFarmIncome}
          onChange={(v) => onChange("nonFarmIncome", v)}
        />
      </div>
    </fieldset>
  )
}

function AddressFields<T extends Record<string, string>>({
  value,
  onChange,
}: {
  value: T
  onChange: (field: keyof T, value: string) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold text-black/45">
        Primary address
      </legend>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label="Street"
          value={value.street}
          onChange={(v) => onChange("street", v)}
        />
        <Field
          label="City"
          value={value.city}
          onChange={(v) => onChange("city", v)}
        />
        <Field
          label="State"
          maxLength={2}
          value={value.state}
          onChange={(v) => onChange("state", v.toUpperCase())}
        />
        <Field
          label="ZIP"
          value={value.zip}
          onChange={(v) => onChange("zip", v)}
        />
      </div>
    </fieldset>
  )
}

function Field({
  label,
  onChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  label: string
  onChange: (value: string) => void
}) {
  return (
    <label className={labelClass}>
      {label}
      <input
        {...props}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </label>
  )
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${active ? "border-[#36734e]/30 bg-[#edf3ed] text-[#285b3d]" : "border-black/8 bg-white text-black/50 hover:bg-black/[0.025]"}`}
    >
      {children}
    </button>
  )
}

function ReviewCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="rounded-xl border border-black/8 bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-[#285b3d]">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-sm text-black/55">{body}</p>
    </div>
  )
}

function createNewOrganization(): Extract<OrganizationDraft, { mode: "new" }> {
  return {
    mode: "new",
    name: "",
    fein: "",
    type: "LimitedLiabilityCompany",
    incorporatedDate: "",
    totalAssets: "",
    totalLiabilities: "",
    grossFarmIncome: "0",
    nonFarmIncome: "0",
    street: "",
    city: "",
    state: "",
    zip: "",
  }
}

function canContinue(
  step: number,
  mainApplicant: PersonDraft,
  coApplicants: Array<PersonDraft>,
  organization: OrganizationDraft
) {
  return (
    getStepValidationErrors(step, mainApplicant, coApplicants, organization)
      .length === 0
  )
}

function getStepValidationErrors(
  step: number,
  mainApplicant: PersonDraft,
  coApplicants: Array<PersonDraft>,
  organization: OrganizationDraft
) {
  if (step === 0) {
    return [mainApplicant, ...coApplicants].flatMap((person, index) => {
      const label = index === 0 ? "Main applicant" : `Co-applicant ${index}`
      return getPersonValidationErrors(person).map(
        (message) => `${label}: ${message}`
      )
    })
  }
  if (step === 1) return getOrganizationValidationErrors(organization)
  return []
}

function getPersonValidationErrors(person: PersonDraft) {
  if (person.mode === "existing") {
    return person.personUuid ? [] : ["select a synced CFI person."]
  }

  const errors: Array<string> = []
  if (!person.firstName.trim()) errors.push("enter a first name.")
  if (!person.lastName.trim()) errors.push("enter a last name.")
  if (!/^\S+@\S+\.\S+$/.test(person.email))
    errors.push("enter a valid email address.")
  if (!person.phone.trim()) errors.push("enter a phone number.")
  if (!person.communicationPreference)
    errors.push("select a communication preference.")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(person.birthDate))
    errors.push("enter a date of birth.")
  if (!person.maritalStatus) errors.push("select a marital status.")
  if (!/^\d{9}$/.test(person.govId))
    errors.push("enter a government ID containing exactly 9 digits.")
  if (!isWholeNumberInRange(person.yearsFarming, 1, 99))
    errors.push("years farming must be a whole number from 1 to 99.")
  if (!isWholeNumberInRange(person.sharePercentage, 1, 100))
    errors.push("ownership share must be a whole percentage from 1 to 100.")
  if (!isWholeNumberInRange(person.totalAssets, 1, 2_147_483_647))
    errors.push("total assets must be a whole-dollar amount of at least $1.")
  if (!isWholeNumberInRange(person.totalLiabilities, 1, 2_147_483_647))
    errors.push(
      "total liabilities must be a whole-dollar amount of at least $1."
    )
  if (!isWholeNumberInRange(person.grossFarmIncome || "0", 0, 2_147_483_647))
    errors.push("gross farm income must be a non-negative whole-dollar amount.")
  if (!isWholeNumberInRange(person.nonFarmIncome || "0", 0, 2_147_483_647))
    errors.push("non-farm income must be a non-negative whole-dollar amount.")
  if (!person.street.trim()) errors.push("enter a street address.")
  if (!person.city.trim()) errors.push("enter a city.")
  if (!/^[A-Z]{2}$/.test(person.state))
    errors.push("enter a 2-letter state code.")
  if (!/^\d{5}(-\d{4})?$/.test(person.zip))
    errors.push("enter a 5-digit ZIP or ZIP+4.")
  return errors
}

function getOrganizationValidationErrors(organization: OrganizationDraft) {
  if (organization.mode === "none") return []
  if (organization.mode === "existing") {
    return organization.organizationUuid
      ? []
      : ["Select a synced CFI organization, or choose no organization."]
  }
  const errors: Array<string> = []
  if (!organization.name.trim())
    errors.push("Enter the legal organization name.")
  if (!/^\d{2}[- ]?\d{7}$/.test(organization.fein))
    errors.push("Enter a valid 9-digit EIN.")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(organization.incorporatedDate))
    errors.push("Enter the incorporation date.")
  if (!isWholeNumberInRange(organization.totalAssets, 1, 2_147_483_647))
    errors.push(
      "Organization assets must be a whole-dollar amount of at least $1."
    )
  if (!isWholeNumberInRange(organization.totalLiabilities, 1, 2_147_483_647))
    errors.push(
      "Organization liabilities must be a whole-dollar amount of at least $1."
    )
  if (!organization.street.trim())
    errors.push("Enter the organization street address.")
  if (!organization.city.trim()) errors.push("Enter the organization city.")
  if (!/^[A-Z]{2}$/.test(organization.state))
    errors.push("Enter a 2-letter organization state code.")
  if (!/^\d{5}(-\d{4})?$/.test(organization.zip))
    errors.push("Enter a valid organization ZIP code.")
  return errors
}

function isWholeNumberInRange(value: string, minimum: number, maximum: number) {
  const number = Number(value)
  return Number.isInteger(number) && number >= minimum && number <= maximum
}

function canSubmitFinancing(
  amountDollars: string,
  farmState: string,
  numberOfAcres: string,
  expectedRevenueDollars: string
) {
  return (
    getFinancingValidationErrors(
      amountDollars,
      farmState,
      numberOfAcres,
      expectedRevenueDollars
    ).length === 0
  )
}

function getFinancingValidationErrors(
  amountDollars: string,
  farmState: string,
  numberOfAcres: string,
  expectedRevenueDollars: string
) {
  const errors: Array<string> = []
  if (!isPositiveDollarAmount(amountDollars))
    errors.push(
      "Enter a positive requested financing amount with no more than two decimal places."
    )
  if (farmState && !/^[A-Z]{2}$/.test(farmState))
    errors.push("Farm state must be a 2-letter state code.")
  if (numberOfAcres && !/^\d+$/.test(numberOfAcres))
    errors.push("Number of acres must be a non-negative whole number.")
  if (
    expectedRevenueDollars &&
    !/^\d+(?:\.\d{1,2})?$/.test(expectedRevenueDollars)
  )
    errors.push(
      "Expected revenue must be a non-negative amount with no more than two decimal places."
    )
  return errors
}

function isStepComplete(
  step: number,
  mainApplicant: PersonDraft,
  coApplicants: Array<PersonDraft>,
  organization: OrganizationDraft,
  amountDollars: string,
  farmState: string,
  numberOfAcres: string,
  expectedRevenueDollars: string
) {
  if (step < 2)
    return canContinue(step, mainApplicant, coApplicants, organization)
  return canSubmitFinancing(
    amountDollars,
    farmState,
    numberOfAcres,
    expectedRevenueDollars
  )
}

function isPositiveDollarAmount(value: string) {
  return /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) > 0
}

function buildSubmission({
  submissionUuid,
  mainApplicant,
  coApplicants,
  organization,
  amountDollars,
  farmState,
  numberOfAcres,
  expectedRevenueDollars,
}: {
  submissionUuid: string
  mainApplicant: PersonDraft
  coApplicants: Array<PersonDraft>
  organization: OrganizationDraft
  amountDollars: string
  farmState: string
  numberOfAcres: string
  expectedRevenueDollars: string
}): SubmissionInput {
  // The form models roles explicitly; the CFI API represents the same contract
  // positionally, with persons[0] guaranteed to be the main applicant.
  const persons: SubmissionInput["persons"] = [
    mainApplicant,
    ...coApplicants,
  ].map((person) =>
    person.mode === "existing"
      ? {
          kind: "reference",
          personUuid: requiredValue(
            person.personUuid,
            "Look up every existing applicant before submitting."
          ),
        }
      : {
          kind: "record",
          first_name: person.firstName,
          last_name: person.lastName,
          email: person.email,
          phone: person.phone,
          communication_preference: requiredValue(
            person.communicationPreference || null,
            "Select a communication preference."
          ),
          birth_date: toIsoDate(person.birthDate),
          marital_status: requiredValue(
            person.maritalStatus || null,
            "Select a marital status."
          ),
          govID: person.govId,
          title: "Applicant",
          year_began_farming: wholeNumber(person.yearsFarming, "Years farming"),
          share_percentage: wholeNumber(
            person.sharePercentage,
            "Ownership share"
          ),
          totalAssets: positiveWholeNumber(person.totalAssets, "Total assets"),
          totalLiabilities: positiveWholeNumber(
            person.totalLiabilities,
            "Total liabilities"
          ),
          grossFarmIncome: nonnegativeWholeNumber(
            person.grossFarmIncome,
            "Gross farm income"
          ),
          nonFarmIncome: nonnegativeWholeNumber(
            person.nonFarmIncome,
            "Non-farm income"
          ),
          address: [
            {
              street: person.street,
              city: person.city,
              state: person.state,
              zip: person.zip,
              type: "main",
            },
          ],
        }
  )
  const organizationPayload: SubmissionInput["organization"] =
    organization.mode === "none"
      ? null
      : organization.mode === "existing"
        ? {
            kind: "reference",
            organizationUuid: requiredValue(
              organization.organizationUuid,
              "Look up the organization before submitting."
            ),
          }
        : {
            kind: "record",
            name: organization.name,
            ein: organization.fein,
            type: organization.type,
            incorporatedDate: toIsoDate(organization.incorporatedDate),
            incorporatedLocation: organization.state,
            totalAssets: positiveWholeNumber(
              organization.totalAssets,
              "Organization total assets"
            ),
            totalLiabilities: positiveWholeNumber(
              organization.totalLiabilities,
              "Organization total liabilities"
            ),
            grossFarmIncome: nonnegativeWholeNumber(
              organization.grossFarmIncome,
              "Organization gross farm income"
            ),
            nonFarmIncome: nonnegativeWholeNumber(
              organization.nonFarmIncome,
              "Organization non-farm income"
            ),
            address: [
              {
                street: organization.street,
                city: organization.city,
                state: organization.state,
                zip: organization.zip,
                type: "main",
              },
            ],
          }
  const inputFinance =
    farmState || numberOfAcres || expectedRevenueDollars
      ? {
          ...(farmState ? { farmStates: [farmState] } : {}),
          ...(numberOfAcres
            ? {
                numberOfAcres: nonnegativeWholeNumber(
                  numberOfAcres,
                  "Number of acres"
                ),
              }
            : {}),
          ...(expectedRevenueDollars
            ? { expectedRevenueCents: dollarsToCents(expectedRevenueDollars) }
            : {}),
        }
      : undefined
  return {
    submissionUuid,
    persons,
    organization: organizationPayload,
    financeAmountCents: dollarsToCents(amountDollars),
    ...(inputFinance ? { inputFinance } : {}),
  }
}

function dollarsToCents(value: string) {
  const match = value.trim().match(/^(\d+)(?:\.(\d{1,2}))?$/)
  if (!match || (Number(match[1]) === 0 && !Number(match[2] || 0)))
    throw new Error(
      "Enter a positive requested amount with no more than two decimal places."
    )
  return (
    BigInt(match[1]) * 100n +
    BigInt((match[2] || "").padEnd(2, "0"))
  ).toString()
}

function wholeNumber(value: string, label: string) {
  const number = Number(value)
  if (!Number.isInteger(number))
    throw new Error(`${label} must be a whole number.`)
  return number
}
function positiveWholeNumber(value: string, label: string) {
  const number = wholeNumber(value, label)
  if (number < 1) throw new Error(`${label} must be at least 1.`)
  return number
}
function nonnegativeWholeNumber(value: string, label: string) {
  const number = wholeNumber(value || "0", label)
  if (number < 0) throw new Error(`${label} cannot be negative.`)
  return number
}
function toIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("Enter all required dates.")
  return `${value}T00:00:00.000Z`
}
function requiredValue<T>(value: T | null, message: string): T {
  if (value === null) throw new Error(message)
  return value
}
function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}
function personName(person: PersonDraft) {
  return person.mode === "existing"
    ? (person.resolvedName ?? person.email)
    : `${person.firstName} ${person.lastName}`.trim()
}
function organizationName(organization: OrganizationDraft) {
  return organization.mode === "none"
    ? "No organization"
    : organization.mode === "existing"
      ? (organization.resolvedName ?? organization.fein)
      : organization.name
}
function organizationTypeLabel(type: string) {
  return type.replace(/([a-z])([A-Z])/g, "$1 $2")
}
