import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CreatePostFAB = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-20 right-4 z-40">
      <button
        onClick={() => navigate("/create-post")}
        className="w-14 h-14 rounded-full knp-gradient-bg flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
      >
        <Plus className="w-6 h-6 text-primary-foreground" strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default CreatePostFAB;
