import app from "./app";
import { PORT } from "./common/config/env";
import { connectDB } from "./common/config/database";

const init = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on  http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Error starting server: ", error);
    process.exit(1);
  }
};

init();
