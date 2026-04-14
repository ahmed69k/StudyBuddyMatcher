import { prisma } from "../index.js"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

const resolvers ={
    Query: {
        getAllUsers: async()=>{
            return await prisma.user.findMany();
        },
        getUser:async(_,{email})=>{
            if(!isValidEmail(email)) throw new Error("Needs to be a valid email.")
            return await prisma.user.findUnique({where: {email}})
        },
        me: async(_,__,context)=>{
            if(!context.user){
                throw new Error("Not authenticated.")
            }
            return prisma.user.findUnique({
                where: {
                    email: context.user.email
                }
            })
        }

    },
    Mutation: {
        register: async(_,{input})=>{
            const {email,password,username,profilePicture, university, academicYear, phoneNumber} = input;
            const hashPass =(await bcrypt.hash(password,10));
            const data = {email, password: hashPass, username, profilePicture: profilePicture ?? "", university, academicYear, phoneNumber: phoneNumber ?? ""}
            return await prisma.user.create({
                data
            })
        },
        login: async(_,{input})=>{
            const {email,password} = input;
            const user = await prisma.user.findUnique({
                where: {
                    email: email
                }
            });
            if(!user) throw new Error("User not found.")
            const isValid = await bcrypt.compare(password, user.password)
            if(!isValid) throw new Error("Incorrect email or password.");
            const secret = process.env.SECRET_KEY?.trim();
            if (!secret) throw new Error("Server configuration error.");
            const token = jwt.sign(
                { id: user.id, email: user.email },
                secret,
                { expiresIn: "1h" }
            );
            return {
                token, user
            }
        },
        deleteProfile: async(_,{email},context)=>{
            const user = await prisma.user.findUnique({
                where:{
                    email: email
                }
            })
            if(!user) throw new Error("User not found.")
            const ctxUser = await prisma.user.findUnique({
                where: {
                    email: context.user.email
                }
            })
            if(!ctxUser) throw new Error("Unauthorized action.")
            if(ctxUser.id != user.id) throw new Error("Unauthorized action.")
            const deletedUser = await prisma.user.delete({
                where: {
                    id: user.id
                }
            })
            return{
                message: "User deleted successfully.",
                user: deletedUser
            }
        },
        updateUsername: async(_,{username},context)=>{
            const ctxUser = await prisma.user.findUnique({
                where:{
                    id: context.user.id
                }
            })
            if(!ctxUser) throw new Error("Unauthorized action.")
            if(!username || username.trim()==="") throw new Error("Username can't be empty!")
            const updatedUser = await prisma.user.update({
                where: {id: ctxUser.id},
                data: {
                    username: username
                }
            })
            return{
                message: "Username updated successfully!",
                old: ctxUser.username,
                new:username
            }
        },
        updateEmail: async(_,{email},context)=>{
            const ctxUser = await prisma.user.findUnique({
                where:{
                    id: context.user.id
                }
            })
            if(!ctxUser) throw new Error("Unauthorized action.")
            if(!email || email.trim()==="") throw new Error("Email can't be empty!")
            if(!isValidEmail(email)) throw new Error("Email has to follow regular email format. (Example: example@gmail.com)")
            const existingUserWithEmail = await prisma.user.findUnique({
                where:{
                    email: email
                }
            })
            if(ctxUser.email === email) throw new Error("This is already your email.")
            if(existingUserWithEmail) throw new Error("Email already in use.")
            const updatedUser = await prisma.user.update({
                where:{id: ctxUser.id},
                data: {
                    email: email
                }
            })
            return{
                message: "Email updated successfully!",
                old: ctxUser.email,
                new: updatedUser.email
            }
        },
        updatePassword: async(_,{password},context)=>{
            const ctxUser = await prisma.user.findUnique({
                where:{
                    id: context.user.id
                }
            })
            if(!ctxUser) throw new Error("Unauthorized action.")
            if(!password || password.trim()==="") throw new Error("Password cannot be empty!")
            const hashPass = await bcrypt.hash(password,10);
            const updatedUser = await prisma.user.update({
                where:{
                    id: context.user.id
                },
                data:{
                    password: hashPass
                }
            })
            return "Password updated successfully!"
            
        },
        updateProfilePicture: async(_,{profilePicture},context)=>{
            const ctxUser = await prisma.user.findUnique({
                where:{
                    id: context.user.id
                }
            })
            if(!ctxUser) throw new Error("Unauthorized action.")
            const updatedUser = await prisma.user.update({
                where:{id:context.user.id},
                data:{profilePicture:profilePicture}
            })
            return{
                message:"Profile picture updated successfully!",
                old: ctxUser.profilePicture,
                new: profilePicture
            }           
        }
    }
}
export default resolvers