import { useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { useState } from "react";

const LOGIN = gql`
    mutation($input: loginUserInput!){
    login(input: $input) {
        token
    }
}
`

export default function Login(){
    const [login] = useMutation(LOGIN);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e)=>{
        e.preventDefault();
        try{
            const {data} = await login({
                variables:{
                    input:{
                        email,
                        password
                    }
                }
            })
            localStorage.setItem("token", data.login.token)
            console.log("User logged in successfully!")
        }
        catch(err){
            console.log(err.message);
        }
    }
    return (
    <form onSubmit={handleSubmit}>
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button type="submit">Login</button>
    </form>
  );
}