import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import { useState } from "react";

const REGISTER = gql`
    mutation Register($input: createUserInput!){
        register(input:$input){
            username
        }
    }
`

export default function Register(){
    const [register] = useMutation(REGISTER);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [university, setUniversity] = useState("");
    const [academicYear, setAcademicYear] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [profilePicture, setProfilePicture] = useState("");

    const handleSubmit = async (e)=>{
        e.preventDefault();
        try{
            await register({
                variables:{
                    input:{
                        email,
                        password,
                        username,
                        university,
                        academicYear: Number(academicYear),
                        phoneNumber,
                        profilePicture
                    }
                }
            })
            console.log("User added successfully!");
        }
        catch(err){
            console.log(err)
        }
    }
    return (
    <form onSubmit={handleSubmit}>
      <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" onChange={(e) => setPassword(e.target.value)} />
      <input placeholder="Username" onChange={(e) => setUsername(e.target.value)} />
      <input placeholder="University" onChange={(e) => setUniversity(e.target.value)} />
      <input placeholder="Academic Year" onChange={(e) => setAcademicYear(e.target.value)} />
      <input placeholder="Phone Number" onChange={(e) => setPhoneNumber(e.target.value)} />
      <input placeholder="Profile Picture URL" onChange={(e) => setProfilePicture(e.target.value)} />

      <button type="submit">Register</button>
    </form>
  );
}