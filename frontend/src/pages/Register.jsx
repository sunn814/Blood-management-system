import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "donor",
    phone: "",
    bloodGroup: "",
  });
  const [error, setError] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Could not register. Check your connection and try again.");
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Register as a donor, or as a hospital to request blood.">
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" name="name" autoComplete="name" onChange={handleChange} required />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" onChange={handleChange} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password (8+ characters, with a letter and a number)</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            onChange={handleChange}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone number</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" onChange={handleChange} />
        </div>
        <div className="field">
          <label htmlFor="role">I am a</label>
          <select id="role" name="role" onChange={handleChange} value={form.role}>
            <option value="donor">Donor</option>
            <option value="hospital">Hospital or requester</option>
          </select>
          {form.role === "hospital" && (
            <small>An admin checks hospital accounts before they can search donors or raise requests.</small>
          )}
        </div>
        <div className="field">
          <label htmlFor="bloodGroup">Blood group (optional)</label>
          <select id="bloodGroup" name="bloodGroup" onChange={handleChange} value={form.bloodGroup}>
            <option value="">Not sure / skip</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>
        </div>
        <button type="submit">Create account</button>
      </form>
      <p className="auth-switch">
        Already registered? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  );
}
