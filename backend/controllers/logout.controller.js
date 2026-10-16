const logoutController = async (req, res) => {
    try {
        res.clearCookie(
            "trace_token", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                path: "/"
            }
        )
        res.set("Cache-Control", "no-store")
        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        })
        
    } catch (error) {
        console.error("Logout failed: ", error.message)
        return res.status(500).json({
            success: false,
            error: "Internal Server Error"
        })
    }
}

export default logoutController