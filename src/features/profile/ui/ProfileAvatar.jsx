import { useAppSelector } from '../../../app/store/hooks.js'
import { getProfileInitials } from '../lib/profile.js'
import { selectProfile } from '../model/profileSlice.js'
import styles from './ProfileAvatar.module.css'

export function ProfileAvatar({ large = false, previewProfile = null }) {
  const savedProfile = useAppSelector(selectProfile)
  const profile = previewProfile ?? savedProfile

  return (
    <span className={`${styles.avatar} ${large ? styles.large : ''}`} aria-hidden="true">
      {profile.avatarDataUrl ? (
        <img src={profile.avatarDataUrl} alt="" />
      ) : getProfileInitials(profile.firstName, profile.lastName)}
    </span>
  )
}
