import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  GET_ME,
  UPDATE_USERNAME,
  UPDATE_EMAIL,
  UPDATE_PROFILE_PICTURE,
  UPDATE_UNIVERSITY,
  UPDATE_ACADEMIC_YEAR,
  UPDATE_PHONE_NUMBER,
  UPDATE_PASSWORD,
} from "../../graphql/user";

import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Loading from "../../components/ui/Loading";

/* =========================
   MODAL
========================= */
function Modal({
  open,
  title,
  value,
  setValue,
  onClose,
  onSave,
  isFile = false,
  isPassword = false,
  setFile,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-violet-100">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>

        {!isFile ? (
          <input
            type={isPassword ? "password" : "text"}
            className="mt-4 w-full rounded-xl border border-violet-200 px-4 py-3 text-sm outline-none focus:border-violet-400"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        ) : (
          <input
            type="file"
            accept="image/*"
            className="mt-4 w-full text-sm"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="secondary"
            className="px-5 py-2.5 text-sm min-w-[110px]"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            className="px-5 py-2.5 text-sm min-w-[110px]"
            onClick={onSave}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   FIELD
========================= */
function Field({ label, value, onEdit }) {
  return (
    <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-violet-100 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 font-semibold text-slate-900">
            {value || "Not set"}
          </p>
        </div>

        <Button
          variant="secondary"
          className="px-4 py-2.5 text-sm"
          onClick={onEdit}
        >
          Edit
        </Button>
      </div>
    </div>
  );
}

/* =========================
   PAGE
========================= */
export default function ProfileEdit() {
  const navigate = useNavigate();

  const { data, loading, error, refetch } = useQuery(GET_ME, {
    fetchPolicy: "cache-and-network",
  });

  const user = data?.me;

  const [updateUsername] = useMutation(UPDATE_USERNAME);
  const [updateEmail] = useMutation(UPDATE_EMAIL);
  const [updateProfilePicture] = useMutation(UPDATE_PROFILE_PICTURE);
  const [updateUniversity] = useMutation(UPDATE_UNIVERSITY);
  const [updateAcademicYear] = useMutation(UPDATE_ACADEMIC_YEAR);
  const [updatePhoneNumber] = useMutation(UPDATE_PHONE_NUMBER);
  const [updatePassword] = useMutation(UPDATE_PASSWORD);

  const [modal, setModal] = useState({
    open: false,
    field: "",
    value: "",
    mutation: null,
    key: "",
    isFile: false,
    isPassword: false,
    file: null,
  });

  const openModal = (
    label,
    mutation,
    key,
    currentValue = "",
    isFile = false,
    isPassword = false
  ) => {
    setModal({
      open: true,
      field: label,
      value: currentValue || "",
      mutation,
      key,
      isFile,
      isPassword,
      file: null,
    });
  };

  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });

  const handleSave = async () => {
    try {
      let val;

      if (modal.isFile) {
        if (!modal.file) return toast.error("Select an image");
        val = await toBase64(modal.file);
      } else {
        val =
          modal.key === "academicYear"
            ? Number(modal.value)
            : modal.value;
      }

      await modal.mutation({
        variables: {
          [modal.key]: val,
        },
      });

      toast.success(`${modal.field} updated`);
      closeModal();
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Loading/>;
  if (error) return <p className="p-6 text-rose-500">{error.message}</p>;
  if (!user) return <p>No user found</p>;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6">

      {/* TOP BAR */}
      <div className="flex justify-end mb-6">
        <Button
          variant="secondary"
          className="px-5 py-2.5 text-sm"
          onClick={() => navigate("/profile")}
        >
          ← Back
        </Button>
      </div>

      <PageHeader
        eyebrow="Account"
        title="Edit Your Profile"
        description="Manage your account information and security."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Field
          label="Username"
          value={user.username}
          onEdit={() =>
            openModal("Username", updateUsername, "username", user.username)
          }
        />

        <Field
          label="Email"
          value={user.email}
          onEdit={() =>
            openModal("Email", updateEmail, "email", user.email)
          }
        />

        <Field
          label="University"
          value={user.university}
          onEdit={() =>
            openModal("University", updateUniversity, "university", user.university)
          }
        />

        <Field
          label="Academic Year"
          value={user.academicYear}
          onEdit={() =>
            openModal(
              "Academic Year",
              updateAcademicYear,
              "academicYear",
              user.academicYear
            )
          }
        />

        <Field
          label="Phone Number"
          value={user.phoneNumber}
          onEdit={() =>
            openModal(
              "Phone Number",
              updatePhoneNumber,
              "phoneNumber",
              user.phoneNumber
            )
          }
        />

        {/* PASSWORD */}
        <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-violet-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Password</p>
              <p className="font-semibold">••••••••</p>
            </div>

            <Button
              variant="danger"
              className="px-5 py-2.5 text-sm"
              onClick={() =>
                openModal(
                  "Update Password",
                  updatePassword,
                  "password",
                  "",
                  false,
                  true
                )
              }
            >
              Change
            </Button>
          </div>
        </div>

        {/* PROFILE PICTURE */}
        <div className="sm:col-span-2 rounded-2xl bg-white/70 p-4 ring-1 ring-violet-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src={
                  user.profilePicture ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`
                }
                className="h-14 w-14 rounded-full ring-2 ring-violet-200"
              />
              <div>
                <p className="text-xs text-slate-500">Profile Picture</p>
                <p className="font-semibold">Avatar</p>
              </div>
            </div>

            <Button
              variant="secondary"
              className="px-5 py-2.5 text-sm"
              onClick={() =>
                openModal(
                  "Profile Picture",
                  updateProfilePicture,
                  "profilePicture",
                  "",
                  true
                )
              }
            >
              Change
            </Button>
          </div>
        </div>
      </div>

      {/* MODAL */}
      <Modal
        open={modal.open}
        title={modal.field}
        value={modal.value}
        setValue={(v) => setModal((m) => ({ ...m, value: v }))}
        onClose={closeModal}
        onSave={handleSave}
        isFile={modal.isFile}
        isPassword={modal.isPassword}
        setFile={(file) => setModal((m) => ({ ...m, file }))}
      />
    </div>
  );
}