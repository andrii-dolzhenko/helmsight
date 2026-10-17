import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { emailRules } from '../../features/auth/lib/authValidation.js'
import { AuthField } from '../../features/auth/ui/AuthFields.jsx'
import { AuthForm, DemoLink, FormSwitch } from '../../features/auth/ui/AuthForm.jsx'
import styles from '../../features/auth/ui/AuthForm.module.css'

export function ForgotPasswordPage() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ mode: 'onBlur' })
  const [notice, setNotice] = useState('')

  function previewRecovery() {
    reset()
    setNotice('Recovery emails are not available in this preview. No email was sent.')
  }

  return (
    <AuthForm
      title="Forgot Password"
      subtitle="Preview the account recovery request form."
      onSubmit={handleSubmit(previewRecovery)}
      actionLabel="Preview Recovery Request"
      notice={notice}
      onDismissNotice={() => setNotice('')}
      footer={
        <>
          <Link className={styles.previewLink} to="/reset-password">Preview reset password form →</Link>
          <DemoLink />
          <FormSwitch>Remembered your password? <Link to="/sign-in">Back to Sign In</Link></FormSwitch>
        </>
      }
    >
      <AuthField id="recovery-email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" registration={register('email', emailRules)} error={errors.email} />
    </AuthForm>
  )
}
