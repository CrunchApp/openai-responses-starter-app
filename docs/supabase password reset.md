Sends a password reset request to an email address. This method supports the PKCE flow.

The password reset flow consist of 2 broad steps: (i) Allow the user to login via the password reset link; (ii) Update the user's password.
The resetPasswordForEmail() only sends a password reset link to the user's email. To update the user's password, see updateUser().
A PASSWORD_RECOVERY event will be emitted when the password recovery link is clicked. You can use onAuthStateChange() to listen and invoke a callback function on these events.
When the user clicks the reset link in the email they are redirected back to your application. You can configure the URL that the user is redirected to with the redirectTo parameter. See redirect URLs and wildcards to add additional redirect URLs to your project.
After the user has been redirected successfully, prompt them for a new password and call updateUser():

const { data, error } = await supabase.auth.updateUser({
  password: new_password
})


/**
 * Step 1: Send the user an email to get a password reset token.
 * This email contains a link which sends the user back to your application.
 */
const { data, error } = await supabase.auth
  .resetPasswordForEmail('user@email.com')

/**
 * Step 2: Once the user is redirected back to your application,
 * ask the user to reset their password.
 */
 useEffect(() => {
   supabase.auth.onAuthStateChange(async (event, session) => {
     if (event == "PASSWORD_RECOVERY") {
       const newPassword = prompt("What would you like your new password to be?");
       const { data, error } = await supabase.auth
         .updateUser({ password: newPassword })

       if (data) alert("Password updated successfully!")
       if (error) alert("There was an error updating your password.")
     }
   })
 }, [])