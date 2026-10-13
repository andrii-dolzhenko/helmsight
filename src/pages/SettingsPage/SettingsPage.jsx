import { useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks.js'
import {
  PHOTO_MAX_FILE_SIZE,
  PHOTO_TYPES,
  PROFILE_FIELD_MAX_LENGTH,
} from '../../features/profile/lib/profile.js'
import {
  selectProfile,
  selectProfileSaveError,
  selectProfileSaveStatus,
  updateProfile,
} from '../../features/profile/model/profileSlice.js'
import { ProfileAvatar } from '../../features/profile/ui/ProfileAvatar.jsx'
import { PhotoCropDialog } from '../../features/profile/ui/PhotoCropDialog.jsx'
import { useHashTarget } from '../../shared/hooks/useHashTarget.js'
import styles from './SettingsPage.module.css'

const validLength = (value, required, min = 1) => {
  const length = Array.from(value.trim().replace(/\s+/gu, ' ')).length
  if (required && length < min) return `Enter at least ${min} character${min === 1 ? '' : 's'}.`
  return length <= PROFILE_FIELD_MAX_LENGTH || 'Use 60 characters or fewer.'
}

export function SettingsPage() {
  useHashTarget('settings')
  const dispatch = useAppDispatch()
  const profile = useAppSelector(selectProfile)
  const saveStatus = useAppSelector(selectProfileSaveStatus)
  const saveError = useAppSelector(selectProfileSaveError)
  const inputRef = useRef(null)
  const [photoDataUrl, setPhotoDataUrl] = useState(profile.avatarDataUrl)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoError, setPhotoError] = useState('')
  const [saved, setSaved] = useState(false)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const { control, register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    mode: 'onBlur',
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      role: profile.role,
    },
  })

  const onSubmit = async (values) => {
    if (photoError) return
    setSaved(false)
    setPhotoRemoved(false)
    try {
      await dispatch(updateProfile({ ...values, avatarDataUrl: photoDataUrl })).unwrap()
      setSaved(true)
    } catch {
      // The profile slice retains the persistence error for display below.
    }
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    setPhotoError('')
    setSaved(false)
    setPhotoRemoved(false)
    if (!file) return
    if (!PHOTO_TYPES.includes(file.type)) {
      setPhotoError('Choose a JPG, PNG or WebP image.')
      return
    }
    if (file.size > PHOTO_MAX_FILE_SIZE) {
      setPhotoError('Choose a photo smaller than 5 MB.')
      return
    }
    if (!file.size) {
      setPhotoError('The selected file is empty.')
      return
    }
    setPhotoFile(file)
  }

  const handleRemovePhoto = async () => {
    setSaved(false)
    setPhotoRemoved(false)
    try {
      await dispatch(updateProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        role: profile.role,
        avatarDataUrl: null,
      })).unwrap()
      setPhotoDataUrl(null)
      setPhotoError('')
      setPhotoRemoved(true)
    } catch {
      // A failed write leaves the saved photo in place and exposes the slice error.
    }
  }

  const handleReset = () => {
    reset({ firstName: profile.firstName, lastName: profile.lastName, role: profile.role })
    setPhotoDataUrl(profile.avatarDataUrl)
    setPhotoError('')
    setSaved(false)
    setPhotoRemoved(false)
  }

  const [firstName, lastName] = useWatch({ control, name: ['firstName', 'lastName'] })
  const previewProfile = {
    ...profile,
    firstName,
    lastName,
    avatarDataUrl: photoDataUrl,
  }
  const clearSaved = () => {
    setSaved(false)
    setPhotoRemoved(false)
  }

  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <span className={styles.eyebrow}>Personal workspace</span>
        <h1>Profile &amp; Settings</h1>
        <p>Update your local profile. It does not create an authenticated account.</p>
      </header>

      <section className={styles.card} aria-labelledby="profile-details-heading">
        <div className={styles.sectionHeading}>
          <h2 id="profile-details-heading">Profile details</h2>
          <p>Your name, role and photo are displayed throughout the workspace.</p>
        </div>
        <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className={styles.profileGrid}>
            <div className={styles.photoField}>
              <ProfileAvatar large previewProfile={previewProfile} />
              <input ref={inputRef} type="file" accept={PHOTO_TYPES.join(',')}
                className={styles.visuallyHidden} aria-label="Choose profile photo"
                onChange={handleFileChange} />
              <button type="button" className={styles.secondaryButton} onClick={() => inputRef.current?.click()}>
                Upload photo
              </button>
              {photoDataUrl ? (
                <button className={styles.textButton} type="button" onClick={handleRemovePhoto}
                  disabled={saveStatus === 'saving'}>
                  Remove photo
                </button>
              ) : null}
              <p className={styles.hint}>JPG, PNG or WebP <span className={styles.photoSizeHint}>Max 5 MB</span></p>
              {photoError ? <p role="alert" className={styles.error}>{photoError}</p> : null}
            </div>
            <div className={styles.fields}>
              <div className={styles.nameFields}>
                <div className={styles.field}>
                  <label htmlFor="profile-first-name">First name <span aria-hidden="true">*</span></label>
                  <input id="profile-first-name" autoComplete="given-name" maxLength={PROFILE_FIELD_MAX_LENGTH}
                    aria-required="true" aria-invalid={Boolean(errors.firstName)}
                    aria-describedby={errors.firstName ? 'profile-first-error' : 'profile-first-help'}
                    {...register('firstName', { onChange: clearSaved, validate: (value) => validLength(value, true) })} />
                  {errors.firstName ? <p id="profile-first-error" role="alert" className={styles.error}>{errors.firstName.message}</p>
                    : <p className={styles.hint} id="profile-first-help">Used in your personalized greeting.</p>}
                </div>
                <div className={styles.field}>
                  <label htmlFor="profile-last-name">Last name <span className={styles.optional}>(optional)</span></label>
                  <input id="profile-last-name" autoComplete="family-name" maxLength={PROFILE_FIELD_MAX_LENGTH}
                    aria-invalid={Boolean(errors.lastName)}
                    aria-describedby={errors.lastName ? 'profile-last-error' : undefined}
                    {...register('lastName', { onChange: clearSaved, validate: (value) => validLength(value, false) })} />
                  {errors.lastName ? <p id="profile-last-error" role="alert" className={styles.error}>{errors.lastName.message}</p> : null}
                </div>
              </div>
              <div className={styles.field}>
                <label htmlFor="profile-role">Role <span aria-hidden="true">*</span></label>
                <input id="profile-role" autoComplete="organization-title" maxLength={PROFILE_FIELD_MAX_LENGTH}
                  aria-required="true" aria-invalid={Boolean(errors.role)}
                  aria-describedby={errors.role ? 'profile-role-error' : 'profile-role-help'}
                  {...register('role', { onChange: clearSaved, validate: (value) => validLength(value, true, 2) })} />
                {errors.role ? <p id="profile-role-error" role="alert" className={styles.error}>{errors.role.message}</p>
                  : <p className={styles.hint} id="profile-role-help">Display role only; it does not grant permissions.</p>}
              </div>
              {saveError && saveStatus === 'failed' ? <p role="alert" className={styles.error}>{saveError}</p> : null}
              {saved ? <p role="status" className={styles.success}>Profile saved locally.</p> : null}
              {photoRemoved ? <p role="status" className={styles.success}>Photo removed.</p> : null}
              <div className={styles.actions}>
                <button type="button" className={styles.secondaryButton} onClick={handleReset}>Cancel</button>
                <button type="submit" className={styles.saveButton} disabled={isSubmitting || saveStatus === 'saving' || Boolean(photoError)}>
                  {isSubmitting ? 'Saving…' : 'Save profile'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </section>

      <section id="account-security" tabIndex={-1} className={styles.card} aria-labelledby="account-security-heading">
        <div className={styles.sectionHeading}>
          <h2 id="account-security-heading">Account security</h2>
          <p>Password changes will be available after backend authentication is integrated.</p>
        </div>
        <button type="button" className={styles.secondaryButton} disabled>Change password · Coming later</button>
      </section>
      {photoFile ? (
        <PhotoCropDialog
          file={photoFile}
          onClose={() => setPhotoFile(null)}
          onConfirm={(value) => { setPhotoDataUrl(value); setPhotoFile(null); setSaved(false); setPhotoRemoved(false) }}
        />
      ) : null}
    </section>
  )
}
