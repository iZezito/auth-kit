import { Button } from "@/components/ui/button"
import {Link} from "react-router";

export default function NotFound() {
    return (
        <div className="flex w-full flex-col items-center justify-center px-4 text-center mt-10">
            <LinkIcon className="text-[120px]" />
            <h1 className="mt-4 text-6xl font-bold">404</h1>
            <p className="mt-2 text-xl">Page not found</p>
            <p className="mt-4 text-lg">Sorry, we couldn't find the page you're looking for.</p>
            <Link to={'/'}>
            <Button className="mt-6" variant="secondary">
                Go back home
            </Button>
            </Link>
        </div>
    )
}

function LinkIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
    )
}
