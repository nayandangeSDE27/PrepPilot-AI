import React,{useEffect, useState} from 'react'
import { useNavigate, Link } from 'react-router'
import "../auth.form.scss"
import { useAuth } from '../hooks/useAuth'

const Login = () => {

    const { loading, handleLogin } = useAuth()
    const navigate = useNavigate()

    const [ email, setEmail ] = useState("")
    const [ password, setPassword ] = useState("")
    const [ error, setError ] = useState("")
    const [ showLogoutToast, setShowLogoutToast ] = useState(false)

    useEffect(() => {
        const logoutToastText = sessionStorage.getItem('logout-success-toast')

        if (logoutToastText) {
            setShowLogoutToast(true)
            sessionStorage.removeItem('logout-success-toast')

            const timer = setTimeout(() => {
                setShowLogoutToast(false)
            }, 2500)

            return () => clearTimeout(timer)
        }
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        const result = await handleLogin({email,password})
        if (result?.error) {
            setError(result.error)
        } else {
            navigate('/')
        }
    }

    if(loading){
        return (<main><h1>Loading.......</h1></main>)
    }


    return (
        <main>
            {showLogoutToast && (
                <div className='toast toast--success'>Logged out successfully.</div>
            )}
            <div className="form-container">
                <h1>Login</h1>
                {error && <div className="toast toast--error">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            onChange={(e) => { setEmail(e.target.value) }}
                            type="email" id="email" name='email' placeholder='Enter email address' />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            onChange={(e) => { setPassword(e.target.value) }}
                            type="password" id="password" name='password' placeholder='Enter password' />
                    </div>
                    <button className='button primary-button' >Login</button>
                </form>
                <p>Don't have an account? <Link to={"/register"} >Register</Link> </p>
            </div>
        </main>
    )
}

export default Login